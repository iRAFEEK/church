import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks — 3-step auth chain: getUser → profiles → user_churches → role_permission_defaults
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { makeAuthContext, makeSupabaseChain } from '@/lib/api/__tests__/fixtures/factories'
import { GET, POST } from '../route'

// [id] routes use manual auth, not apiHandler
import { PATCH, DELETE } from '../[id]/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHURCH_ID = 'church-test-123'
const ANNOUNCEMENT_ID = 'ann-uuid-1'

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

/**
 * Build a mock Supabase client that satisfies the apiHandler 3-step auth chain:
 *   1. supabase.auth.getUser()
 *   2. supabase.from('profiles').select(...).eq('id', userId).single()
 *   3. supabase.from('user_churches').select('role').eq(...).eq(...).single()
 *   4. supabase.from('role_permission_defaults').select('permissions').eq(...).eq(...).single()
 *
 * Then the handler itself calls supabase.from('announcements')...
 */
function buildSupabase(options: {
  authenticated?: boolean
  role?: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
  announcementsReturn?: { data: unknown; error: unknown; count?: number }
  insertReturn?: { data: unknown; error: unknown }
} = {}) {
  const { authenticated = true, role = 'super_admin' } = options
  const ctx = makeAuthContext(role, CHURCH_ID)

  // Auth step
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: authenticated ? { id: ctx.user.id, email: ctx.user.email } : null,
    },
    error: authenticated ? null : { message: 'not authenticated' },
  })

  // Build a chainable mock for the announcements table
  const announcementsChain = makeSupabaseChain()

  if (options.announcementsReturn) {
    announcementsChain.range.mockImplementation(() => {
      const p = Promise.resolve(options.announcementsReturn)
      return Object.assign(p, announcementsChain)
    })
    announcementsChain.order.mockImplementation(() => {
      const p = Promise.resolve(options.announcementsReturn)
      return Object.assign(p, announcementsChain)
    })
  }

  if (options.insertReturn) {
    announcementsChain.single.mockResolvedValue(options.insertReturn)
  }

  // Profile lookup (step 2)
  const profileSingle = vi.fn().mockResolvedValue({
    data: { id: ctx.user.id, church_id: CHURCH_ID, role, permissions: null },
    error: null,
  })

  // user_churches lookup (step 3)
  const membershipSingle = vi.fn().mockResolvedValue({
    data: { role },
    error: null,
  })

  // role_permission_defaults lookup (step 4)
  const roleDefaultsSingle = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  })

  // Track which step we're on per table
  let profileCallCount = 0
  let userChurchesCallCount = 0
  let roleDefaultsCallCount = 0

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      profileCallCount++
      const chain = makeSupabaseChain()
      chain.single.mockResolvedValue({
        data: { id: ctx.user.id, church_id: CHURCH_ID, role, permissions: null },
        error: null,
      })
      return chain
    }
    if (table === 'user_churches') {
      userChurchesCallCount++
      const chain = makeSupabaseChain()
      chain.single.mockResolvedValue({ data: { role }, error: null })
      return chain
    }
    if (table === 'role_permission_defaults') {
      roleDefaultsCallCount++
      const chain = makeSupabaseChain()
      chain.single.mockResolvedValue({ data: null, error: null })
      return chain
    }
    // announcements table
    return announcementsChain
  })

  return {
    from,
    auth: { getUser },
    _announcementsChain: announcementsChain,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildSupabase({ authenticated: false })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/announcements')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('filters announcements by church_id from profile', async () => {
    const supa = buildSupabase({
      authenticated: true,
      announcementsReturn: { data: [], error: null, count: 0 },
    })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/announcements')
    await GET(req)

    // The handler queries from('announcements') and filters by church_id
    expect(supa.from).toHaveBeenCalledWith('announcements')
    expect(supa._announcementsChain.eq).toHaveBeenCalledWith('church_id', CHURCH_ID)
  })
})

describe('POST /api/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildSupabase({ authenticated: false })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', title_ar: 'اختبار', status: 'draft' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('sets church_id from profile on insert', async () => {
    const insertedAnnouncement = {
      id: ANNOUNCEMENT_ID,
      church_id: CHURCH_ID,
      title: 'Test Announcement',
      title_ar: 'إعلان اختبار',
      status: 'draft',
    }
    const supa = buildSupabase({
      authenticated: true,
      role: 'super_admin',
      insertReturn: { data: insertedAnnouncement, error: null },
    })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Announcement',
        title_ar: 'إعلان اختبار',
        status: 'draft',
      }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(supa._announcementsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ church_id: CHURCH_ID }),
    )
  })
})

describe('PATCH /api/announcements/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    // [id] route uses manual auth (createClient -> getUser)
    const supa = buildSupabase({ authenticated: false })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest(`/api/announcements/${ANNOUNCEMENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: ANNOUNCEMENT_ID }) })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

describe('DELETE /api/announcements/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildSupabase({ authenticated: false })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest(`/api/announcements/${ANNOUNCEMENT_ID}`, {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: ANNOUNCEMENT_ID }) })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})
