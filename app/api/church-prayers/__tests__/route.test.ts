import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  resolveApiPermissions: vi.fn(),
}))

vi.mock('@/lib/messaging/dispatcher', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from '../route'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHURCH_ID = 'church-uuid-1'
const USER_ID = 'user-uuid-1'

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

/** Build a supabase mock where auth.getUser resolves to given user (or null). */
function buildSupabase(overrides: {
  user?: unknown
  profile?: unknown
  queryData?: unknown[]
} = {}) {
  const { user, profile, queryData } = overrides

  // Default profile
  const defaultProfile = profile ?? {
    church_id: CHURCH_ID,
    role: 'member',
    permissions: {},
  }

  // Chain builders for query results
  const limitFn = vi.fn().mockResolvedValue({ data: queryData ?? [], error: null })
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
  const isFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: orderFn }), order: orderFn })
  const eqChurch = vi.fn().mockReturnValue({ is: isFn, order: orderFn, eq: vi.fn().mockReturnValue({ order: orderFn }) })
  const selectQuery = vi.fn().mockReturnValue({ eq: eqChurch })

  // Profile lookup chain: .select(...).eq('id', user.id).single()
  const profileSingle = vi.fn().mockResolvedValue({ data: defaultProfile, error: null })
  const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
  const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

  // Insert chain (for POST)
  const insertSingle = vi.fn().mockResolvedValue({
    data: { id: 'prayer-1', content: 'Test prayer', is_anonymous: false, status: 'active', created_at: new Date().toISOString() },
    error: null,
  })
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
  const insertFn = vi.fn().mockReturnValue({ select: insertSelect })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') return { select: profileSelect }
    if (table === 'prayer_requests') return { select: selectQuery, insert: insertFn }
    return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) }
  })

  const getUser = vi.fn().mockResolvedValue({
    data: { user: user !== undefined ? user : { id: USER_ID } },
  })

  return { from, auth: { getUser }, insertFn }
}

// ---------------------------------------------------------------------------
// GET /api/church-prayers
// ---------------------------------------------------------------------------

describe('GET /api/church-prayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/church-prayers')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('filters prayer requests by church_id from profile', async () => {
    const supa = buildSupabase()
    vi.mocked(createClient).mockResolvedValue(supa as any)
    vi.mocked(createAdminClient).mockResolvedValue(supa as any)
    vi.mocked(resolveApiPermissions).mockResolvedValue({ can_view_prayers: true } as any)

    const req = makeRequest('/api/church-prayers')
    await GET(req)

    // Verify from('prayer_requests') was called
    expect(supa.from).toHaveBeenCalledWith('prayer_requests')
    // The route source must filter by church_id — verify via code inspection
    const routeCode = await import('fs').then(fs =>
      fs.readFileSync('app/api/church-prayers/route.ts', 'utf-8')
    )
    expect(routeCode).toContain(".eq('church_id', profile.church_id)")
  })
})

// ---------------------------------------------------------------------------
// POST /api/church-prayers
// ---------------------------------------------------------------------------

describe('POST /api/church-prayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/church-prayers', {
      method: 'POST',
      body: JSON.stringify({ content: 'Please pray for me' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('sets church_id from authenticated profile, not from request body', async () => {
    const supa = buildSupabase({
      profile: { church_id: CHURCH_ID, first_name: 'Test', first_name_ar: 'تجربة' },
    })
    vi.mocked(createClient).mockResolvedValue(supa as any)
    vi.mocked(createAdminClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/church-prayers', {
      method: 'POST',
      body: JSON.stringify({ content: 'Pray for healing', church_id: 'evil-church-id' }),
    })

    await POST(req)

    // The insert must use profile.church_id, not the body's church_id
    expect(supa.insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ church_id: CHURCH_ID })
    )
    // Ensure the evil church_id from body was NOT used
    expect(supa.insertFn).not.toHaveBeenCalledWith(
      expect.objectContaining({ church_id: 'evil-church-id' })
    )
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/church-prayers/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/church-prayers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const { PATCH } = await import('../../church-prayers/[id]/route')

    const req = makeRequest('/api/church-prayers/prayer-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'answered' }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'prayer-1' }) })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/church-prayers/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/church-prayers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const { DELETE } = await import('../../church-prayers/[id]/route')

    const req = makeRequest('/api/church-prayers/prayer-1', {
      method: 'DELETE',
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: 'prayer-1' }) })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})
