import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase chainable mock ─────────────────────────────────────────────────
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
const chainMethods = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not',
  'or', 'order', 'range', 'limit', 'throwOnError',
]
for (const m of chainMethods) {
  mockChain[m] = vi.fn().mockReturnValue(mockChain)
}
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
mockChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

// Make .order() and .range() thenable (for await at end of chain)
for (const m of ['order', 'range', 'is']) {
  mockChain[m].mockImplementation(() => {
    const p = Promise.resolve({ data: [], error: null, count: 0 })
    return Object.assign(p, mockChain)
  })
}

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(mockChain),
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}))

// Mock messaging modules used by send/audience/scopes routes
const mockGetSendableScopes = vi.fn()
const mockValidateTargetsAgainstScopes = vi.fn()
const mockResolveAudience = vi.fn()
const mockCountAudience = vi.fn()
const mockSendNotification = vi.fn()

vi.mock('@/lib/messaging/scopes', () => ({
  getSendableScopes: (...args: unknown[]) => mockGetSendableScopes(...args),
  validateTargetsAgainstScopes: (...args: unknown[]) => mockValidateTargetsAgainstScopes(...args),
}))

vi.mock('@/lib/messaging/audience', () => ({
  resolveAudience: (...args: unknown[]) => mockResolveAudience(...args),
  countAudience: (...args: unknown[]) => mockCountAudience(...args),
}))

vi.mock('@/lib/messaging/dispatcher', () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}))

vi.mock('@/lib/messaging/providers/whatsapp', () => ({
  whatsappProvider: { isConfigured: vi.fn().mockReturnValue(false), send: vi.fn() },
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockAuth(role = 'super_admin', churchId = 'church-notif-test') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  // profiles query → user_churches query → role_permission_defaults query
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
}

const makeReq = (method = 'GET', body?: object, path = '/api/notifications', query = '') =>
  new NextRequest(`http://localhost${path}${query}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Import route handlers (after mocks) ─────────────────────────────────────

import { GET } from '@/app/api/notifications/route'
import { POST as SendPOST } from '@/app/api/notifications/send/route'
import { POST as AudiencePOST } from '@/app/api/notifications/audience/route'
import { GET as ScopesGET } from '@/app/api/notifications/scopes/route'
import { PATCH as ReadAllPATCH } from '@/app/api/notifications/read-all/route'
import { PATCH as SinglePATCH } from '@/app/api/notifications/[id]/route'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chain methods
    for (const m of chainMethods) {
      mockChain[m].mockReturnValue(mockChain)
    }
    for (const m of ['order', 'range', 'is']) {
      mockChain[m].mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null, count: 0 })
        return Object.assign(p, mockChain)
      })
    }
    mockChain.single.mockResolvedValue({ data: null, error: null })
  })

  // ── 1. GET /notifications returns 401 unauthenticated ──────────────────
  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await GET(makeReq())
      expect(res.status).toBe(401)
    })
  })

  // ── 2. GET /notifications filters by profile_id (user's own) ───────────
  describe('GET — filters by profile_id', () => {
    it('queries notifications for the authenticated user only', async () => {
      mockAuth('member')

      let capturedProfileId: string | undefined
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        if (col === 'profile_id') capturedProfileId = val as string
        return mockChain
      })

      // After auth chain (3 singles), the GET handler calls:
      // 1. main query chain (returns via range)
      // 2. unread count query (returns via is)
      await GET(makeReq())
      expect(capturedProfileId).toBe('user-1')
    })
  })

  // ── 8. GET /notifications paginates results ────────────────────────────
  describe('GET — pagination', () => {
    it('returns paginated response with page metadata', async () => {
      mockAuth('member')

      const mockNotifications = [
        { id: 'n1', type: 'general', channel: 'in_app', title: 'Test', body: 'Body', status: 'sent', read_at: null, created_at: '2026-01-01' },
      ]

      // After auth chain, the main query resolves with data
      mockChain.range.mockImplementation(() => {
        const p = Promise.resolve({ data: mockNotifications, error: null, count: 25 })
        return Object.assign(p, mockChain)
      })
      // Unread count query
      mockChain.is.mockImplementation(() => {
        const p = Promise.resolve({ data: null, error: null, count: 5 })
        return Object.assign(p, mockChain)
      })

      const res = await GET(makeReq('GET', undefined, '/api/notifications', '?page=2&pageSize=10'))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.page).toBe(2)
      expect(json.pageSize).toBe(10)
      expect(json.totalPages).toBe(3) // ceil(25 / 10)
      expect(json.data).toHaveLength(1)
    })
  })
})

// ── 3. POST /notifications/send returns 401 unauthenticated ──────────────
describe('/api/notifications/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of chainMethods) {
      mockChain[m].mockReturnValue(mockChain)
    }
    for (const m of ['order', 'range', 'is']) {
      mockChain[m].mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null, count: 0 })
        return Object.assign(p, mockChain)
      })
    }
    mockChain.single.mockResolvedValue({ data: null, error: null })
  })

  it('returns 401 for unauthenticated request', async () => {
    mockUnauth()
    const res = await SendPOST(makeReq('POST', {
      titleAr: 'عنوان',
      bodyAr: 'محتوى',
      targets: [{ type: 'all_church' }],
    }, '/api/notifications/send'))
    expect(res.status).toBe(401)
  })

  // ── 4. POST /notifications/send validates scope before sending ─────────
  it('returns 403 when scope validation fails', async () => {
    mockAuth('ministry_leader')
    mockGetSendableScopes.mockResolvedValue({
      role: 'ministry_leader',
      canSend: true,
      isUnscoped: false,
      allowedTargetTypes: ['ministries', 'groups'],
      ministryIds: ['m1'],
      groupIds: ['g1'],
    })
    mockValidateTargetsAgainstScopes.mockReturnValue({
      valid: false,
      error: 'You cannot target by "all_church"',
    })

    const res = await SendPOST(makeReq('POST', {
      titleAr: 'عنوان',
      bodyAr: 'محتوى',
      targets: [{ type: 'all_church' }],
    }, '/api/notifications/send'))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('all_church')
  })

  // ── 10. POST /notifications/send requires can_send_notifications permission ─
  it('returns 403 when user has no send permission (member role)', async () => {
    mockAuth('member')
    mockGetSendableScopes.mockResolvedValue({
      role: 'member',
      canSend: false,
      isUnscoped: false,
      allowedTargetTypes: [],
      ministryIds: [],
      groupIds: [],
    })

    const res = await SendPOST(makeReq('POST', {
      titleAr: 'عنوان',
      bodyAr: 'محتوى',
      targets: [{ type: 'all_church' }],
    }, '/api/notifications/send'))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Forbidden')
  })

  it('sends successfully with valid scope and data', async () => {
    mockAuth('super_admin')
    mockGetSendableScopes.mockResolvedValue({
      role: 'super_admin',
      canSend: true,
      isUnscoped: true,
      allowedTargetTypes: ['all_church', 'roles', 'groups', 'ministries', 'statuses', 'visitors', 'gender'],
      ministryIds: [],
      groupIds: [],
    })
    mockValidateTargetsAgainstScopes.mockReturnValue({ valid: true })
    mockResolveAudience.mockResolvedValue({
      profileIds: ['p1', 'p2'],
      visitorPhones: [],
    })
    mockSendNotification.mockResolvedValue(undefined)

    const res = await SendPOST(makeReq('POST', {
      titleAr: 'عنوان',
      bodyAr: 'محتوى',
      targets: [{ type: 'all_church' }],
    }, '/api/notifications/send'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(2)
    expect(json.targets).toBe(2)
  })
})

// ── 5. POST /notifications/audience returns 401 unauthenticated ──────────
describe('/api/notifications/audience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of chainMethods) {
      mockChain[m].mockReturnValue(mockChain)
    }
    mockChain.single.mockResolvedValue({ data: null, error: null })
  })

  it('returns 401 for unauthenticated request', async () => {
    mockUnauth()
    const res = await AudiencePOST(makeReq('POST', {
      targets: [{ type: 'all_church' }],
    }, '/api/notifications/audience'))
    expect(res.status).toBe(401)
  })
})

// ── 6. GET /notifications/scopes returns 401 unauthenticated ─────────────
describe('/api/notifications/scopes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of chainMethods) {
      mockChain[m].mockReturnValue(mockChain)
    }
    mockChain.single.mockResolvedValue({ data: null, error: null })
  })

  it('returns 401 for unauthenticated request', async () => {
    mockUnauth()
    const res = await ScopesGET(makeReq('GET', undefined, '/api/notifications/scopes'))
    expect(res.status).toBe(401)
  })
})

// ── 7. POST /notifications/read-all marks all as read for user ───────────
describe('/api/notifications/read-all', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of chainMethods) {
      mockChain[m].mockReturnValue(mockChain)
    }
    for (const m of ['order', 'range', 'is']) {
      mockChain[m].mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null, count: 0 })
        return Object.assign(p, mockChain)
      })
    }
    mockChain.single.mockResolvedValue({ data: null, error: null })
  })

  it('marks all unread notifications as read for the authenticated user', async () => {
    mockAuth('member')

    // The update chain: update → eq(profile_id) → eq(channel) → is(read_at, null)
    // .is() is the terminal here and resolves
    mockChain.is.mockImplementation(() => {
      const p = Promise.resolve({ data: null, error: null })
      return Object.assign(p, mockChain)
    })

    let capturedProfileId: string | undefined
    let capturedUpdate: Record<string, unknown> | undefined
    mockChain.update.mockImplementation((payload: Record<string, unknown>) => {
      capturedUpdate = payload
      return mockChain
    })
    mockChain.eq.mockImplementation((col: string, val: unknown) => {
      if (col === 'profile_id') capturedProfileId = val as string
      return mockChain
    })

    const res = await ReadAllPATCH(makeReq('PATCH', undefined, '/api/notifications/read-all'))
    expect(res.status).toBe(200)
    expect(capturedProfileId).toBe('user-1')
    expect(capturedUpdate).toHaveProperty('status', 'read')
    expect(capturedUpdate).toHaveProperty('read_at')
  })
})

// ── 9. PATCH /notifications/[id] marks single notification as read ───────
describe('/api/notifications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of chainMethods) {
      mockChain[m].mockReturnValue(mockChain)
    }
    for (const m of ['order', 'range', 'is']) {
      mockChain[m].mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null, count: 0 })
        return Object.assign(p, mockChain)
      })
    }
    mockChain.single.mockResolvedValue({ data: null, error: null })
  })

  it('marks a single notification as read by id and profile_id', async () => {
    mockAuth('member')

    const notifId = 'notif-abc-123'

    // After auth chain (3 singles), the handler calls:
    // update → eq(id) → eq(profile_id) → select → single
    mockChain.single
      .mockResolvedValueOnce({ data: { id: 'user-1', church_id: 'church-notif-test', role: 'member', permissions: null }, error: null })
      .mockResolvedValueOnce({ data: { role: 'member' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: notifId, status: 'read', read_at: '2026-01-01T00:00:00Z' }, error: null })

    let capturedId: string | undefined
    let capturedProfileId: string | undefined
    mockChain.eq.mockImplementation((col: string, val: unknown) => {
      if (col === 'id') capturedId = val as string
      if (col === 'profile_id') capturedProfileId = val as string
      return mockChain
    })

    const res = await SinglePATCH(
      makeReq('PATCH', undefined, `/api/notifications/${notifId}`),
      { params: Promise.resolve({ id: notifId }) },
    )
    expect(res.status).toBe(200)
    expect(capturedId).toBe(notifId)
    expect(capturedProfileId).toBe('user-1')
  })
})
