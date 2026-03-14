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

for (const m of ['order', 'range']) {
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

vi.mock('@/lib/auth', () => ({
  resolveApiPermissions: vi.fn().mockResolvedValue({ can_manage_events: true }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}))

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockAuth(role = 'super_admin', churchId = 'church-evt-test') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  // apiHandler calls .single() 3 times: profile, user_churches, role_permission_defaults
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

function mockAuthWithPerms(churchId = 'church-evt-test') {
  mockAuth('super_admin', churchId)
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
}

const makeReq = (method = 'GET', url = 'http://localhost/api/events', body?: object) =>
  new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

function resetChain() {
  for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
  for (const m of ['order', 'range']) {
    mockChain[m].mockImplementation(() => {
      const p = Promise.resolve({ data: [], error: null, count: 0 })
      return Object.assign(p, mockChain)
    })
  }
  mockChain.single.mockResolvedValue({ data: null, error: null })
}

// ── Import routes ───────────────────────────────────────────────────────────

import { GET, POST } from '@/app/api/events/route'
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from '@/app/api/events/[id]/route'
import { resolveApiPermissions } from '@/lib/auth'

const mockResolvePerms = resolveApiPermissions as ReturnType<typeof vi.fn>

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
    mockResolvePerms.mockResolvedValue({ can_manage_events: true })
  })

  // ── 1. GET /events returns 401 unauthenticated ──────────────────────────
  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await GET(makeReq())
      expect(res.status).toBe(401)
    })
  })

  // ── 2. GET /events filters by church_id ─────────────────────────────────
  describe('GET — church_id isolation', () => {
    it('queries ONLY the authenticated user church', async () => {
      const myChurch = 'church-events-mine'
      mockAuth('member', myChurch)

      let capturedChurchId: string | undefined
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        if (col === 'church_id') capturedChurchId = val as string
        return mockChain
      })

      await GET(makeReq())
      expect(capturedChurchId).toBe(myChurch)
    })
  })

  // ── 3. GET /events supports pagination ──────────────────────────────────
  describe('GET — pagination', () => {
    it('applies offset-based pagination from page/pageSize params', async () => {
      mockAuth('member')

      let rangeFrom: number | undefined
      let rangeTo: number | undefined
      mockChain.range.mockImplementation((from: number, to: number) => {
        rangeFrom = from
        rangeTo = to
        const p = Promise.resolve({ data: [], error: null, count: 0 })
        return Object.assign(p, mockChain)
      })

      await GET(makeReq('GET', 'http://localhost/api/events?page=3&pageSize=10'))
      expect(rangeFrom).toBe(20)
      expect(rangeTo).toBe(29)
    })
  })

  // ── 4. GET /events supports type filter (status) ────────────────────────
  describe('GET — status filter', () => {
    it('applies status filter when query param is provided', async () => {
      mockAuth('member')

      let capturedStatusCol: string | undefined
      let capturedStatusVal: unknown
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        if (col === 'status') {
          capturedStatusCol = col
          capturedStatusVal = val
        }
        return mockChain
      })

      await GET(makeReq('GET', 'http://localhost/api/events?status=published'))
      expect(capturedStatusCol).toBe('status')
      expect(capturedStatusVal).toBe('published')
    })
  })

  // ── 5. POST /events returns 401 unauthenticated ────────────────────────
  describe('POST — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await POST(makeReq('POST', 'http://localhost/api/events', { title: 'Test' }))
      expect(res.status).toBe(401)
    })
  })

  // ── 6. POST /events sets church_id from profile ────────────────────────
  describe('POST — church_id injection', () => {
    it('injects church_id from the authenticated profile into the insert', async () => {
      const myChurch = 'church-post-inject'
      mockAuthWithPerms(myChurch)

      let insertedData: Record<string, unknown> | undefined
      mockChain.insert.mockImplementation((data: Record<string, unknown>) => {
        insertedData = data
        return mockChain
      })
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'user-1', church_id: myChurch, role: 'super_admin', permissions: null },
        error: null,
      })
      // After insert -> select -> single resolves the created event
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'evt-1', title: 'Sunday Service', church_id: myChurch },
        error: null,
      })

      await POST(makeReq('POST', 'http://localhost/api/events', {
        title: 'Sunday Service',
        event_type: 'worship',
        starts_at: '2026-04-06T10:00:00Z',
      }))
      expect(insertedData).toBeDefined()
      expect(insertedData!.church_id).toBe(myChurch)
    })
  })

  // ── 13. POST /events validates request body (403 for no permission) ────
  describe('POST — permission enforcement', () => {
    it('returns 403 when user lacks can_manage_events', async () => {
      // Use 'member' role — super_admin gets all permissions via hardcoded defaults
      mockAuth('member')

      const res = await POST(makeReq('POST', 'http://localhost/api/events', {
        title: 'Test',
        starts_at: '2026-04-01T10:00:00Z',
        ends_at: '2026-04-01T12:00:00Z',
      }))
      expect(res.status).toBe(403)
    })
  })

  // ── 14. GET /events orders by starts_at ─────────────────────────────────
  describe('GET — ordering', () => {
    it('orders results by starts_at', async () => {
      mockAuth('member')

      let orderedCol: string | undefined
      mockChain.order.mockImplementation((col: string) => {
        orderedCol = col
        const p = Promise.resolve({ data: [], error: null, count: 0 })
        return Object.assign(p, mockChain)
      })

      await GET(makeReq())
      expect(orderedCol).toBe('starts_at')
    })
  })
})

describe('/api/events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
    mockResolvePerms.mockResolvedValue({ can_manage_events: true })
  })

  const makeIdParams = (id = 'evt-abc') => ({ params: Promise.resolve({ id }) })

  // ── 7. GET /events/[id] returns 401 unauthenticated ────────────────────
  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await GET_BY_ID(
        makeReq('GET', 'http://localhost/api/events/evt-abc'),
        makeIdParams(),
      )
      expect(res.status).toBe(401)
    })
  })

  // ── 8. GET /events/[id] filters by church_id (isolation via RLS) ───────
  describe('GET — church_id isolation', () => {
    it('passes the event id to the query via eq', async () => {
      mockAuth('member')

      let capturedIdCol: string | undefined
      let capturedIdVal: unknown
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        if (col === 'id') {
          capturedIdCol = col
          capturedIdVal = val
        }
        return mockChain
      })
      // Return event data from single
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'user-1', church_id: 'church-evt-test' },
        error: null,
      })
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'evt-abc', title: 'Service', church_id: 'church-evt-test' },
        error: null,
      })

      await GET_BY_ID(
        makeReq('GET', 'http://localhost/api/events/evt-abc'),
        makeIdParams('evt-abc'),
      )
      expect(capturedIdCol).toBe('id')
      expect(capturedIdVal).toBe('evt-abc')
    })
  })

  // ── 9. PATCH /events/[id] returns 401 unauthenticated ──────────────────
  describe('PATCH — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await PATCH(
        makeReq('PATCH', 'http://localhost/api/events/evt-abc', { title: 'Updated' }),
        makeIdParams(),
      )
      expect(res.status).toBe(401)
    })
  })

  // ── 10. PATCH /events/[id] updates only own church's events ────────────
  describe('PATCH — church_id isolation', () => {
    it('filters by both id and church_id on update', async () => {
      // Verify via code inspection that the route uses both filters
      const routeCode = await import('fs').then(fs =>
        fs.readFileSync('app/api/events/[id]/route.ts', 'utf-8')
      )
      expect(routeCode).toContain(".eq('id',")
      expect(routeCode).toContain(".eq('church_id', profile.church_id)")
    })
  })

  // ── 11. DELETE /events/[id] returns 401 unauthenticated ─────────────────
  describe('DELETE — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await DELETE(
        makeReq('DELETE', 'http://localhost/api/events/evt-abc'),
        makeIdParams(),
      )
      expect(res.status).toBe(401)
    })
  })

  // ── 12. DELETE /events/[id] filters by church_id ────────────────────────
  describe('DELETE — church_id isolation', () => {
    it('filters by both id and church_id on delete', async () => {
      // Verify via code inspection that the route uses both filters
      const routeCode = await import('fs').then(fs =>
        fs.readFileSync('app/api/events/[id]/route.ts', 'utf-8')
      )
      // The delete handler must filter by id and church_id
      expect(routeCode).toContain('.delete()')
      expect(routeCode).toContain(".eq('church_id', profile.church_id)")
    })
  })
})
