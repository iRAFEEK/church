import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase chainable mock ─────────────────────────────────────────────────
// One shared chain. Terminal calls (.single/.maybeSingle) resolve queued results;
// non-terminal builder calls return the chain so we can inspect .eq()/.upsert() args.
const chainMethods = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'in', 'is', 'order', 'range', 'limit',
]
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) mockChain[m] = vi.fn(() => mockChain)
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
mockChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

// The GET query is terminal at .limit() (no .single()); make it thenable.
let listResult: { data?: unknown; error: unknown } = { data: [], error: null }
mockChain.limit = vi.fn(() => {
  const p = Promise.resolve(listResult)
  return Object.assign(p, mockChain)
})

// upsert() (membership grant) is awaited directly — make it thenable too.
let upsertResult: { error: unknown } = { error: null }
mockChain.upsert = vi.fn(() => {
  const p = Promise.resolve(upsertResult)
  return Object.assign(p, mockChain)
})

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => mockChain),
  })),
}))

vi.mock('@/lib/auth', () => ({ resolveApiPermissions: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  checkRateLimitAsync: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: unknown) => fn),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────
function mockAuth(role = 'super_admin', churchId = 'church-1') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'admin-1', email: 'admin@test.com' } },
    error: null,
  })
  // apiHandler resolves auth via 3 .single() calls: profile, user_churches, role_defaults
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'admin-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role, status: 'active' }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111'

const makeReq = (method = 'GET', body?: object) =>
  new NextRequest('http://localhost/api/churches/join-requests', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

import { GET, PATCH } from '@/app/api/churches/join-requests/route'

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
  mockChain.single.mockResolvedValue({ data: null, error: null })
  mockChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  listResult = { data: [], error: null }
  upsertResult = { error: null }
  mockChain.limit.mockImplementation(() => Object.assign(Promise.resolve(listResult), mockChain))
  mockChain.upsert.mockImplementation(() => Object.assign(Promise.resolve(upsertResult), mockChain))
})

// ── GET — role gate + scoping ────────────────────────────────────────────────
describe('GET /api/churches/join-requests', () => {
  it('returns 401 for an unauthenticated request', async () => {
    mockUnauth()
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('rejects a plain member (403) — approvers only', async () => {
    mockAuth('member')
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(403)
  })

  it('allows a ministry_leader and returns pending requests', async () => {
    mockAuth('ministry_leader')
    listResult = { data: [{ id: 'req-1', profile_id: 'p-1', status: 'pending' }], error: null }
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })

  it('scopes the query to the caller church_id and to status=pending', async () => {
    mockAuth('super_admin', 'church-scoped-abc')
    const eqCalls: Array<[string, unknown]> = []
    mockChain.eq.mockImplementation((col: string, val: unknown) => {
      eqCalls.push([col, val])
      return mockChain
    })

    await GET(makeReq('GET'))

    expect(eqCalls).toContainEqual(['church_id', 'church-scoped-abc'])
    expect(eqCalls).toContainEqual(['status', 'pending'])
  })
})

// ── PATCH — approve / reject ─────────────────────────────────────────────────
describe('PATCH /api/churches/join-requests', () => {
  it('returns 401 for an unauthenticated request', async () => {
    mockUnauth()
    const res = await PATCH(makeReq('PATCH', { request_id: VALID_UUID, action: 'approved' }))
    expect(res.status).toBe(401)
  })

  it('rejects a plain member (403)', async () => {
    mockAuth('member')
    const res = await PATCH(makeReq('PATCH', { request_id: VALID_UUID, action: 'approved' }))
    expect(res.status).toBe(403)
  })

  it('approve grants an active member membership for the requester', async () => {
    mockAuth('super_admin', 'church-approve')
    // 4th .single() = the request UPDATE result
    mockChain.single.mockResolvedValueOnce({
      data: { id: VALID_UUID, profile_id: 'requester-9', status: 'approved' },
      error: null,
    })

    const res = await PATCH(makeReq('PATCH', { request_id: VALID_UUID, action: 'approved' }))
    expect(res.status).toBe(200)

    // The membership grant must upsert the requester into THIS church.
    expect(mockChain.upsert).toHaveBeenCalledTimes(1)
    const upsertArg = mockChain.upsert.mock.calls[0][0] as Record<string, unknown>
    expect(upsertArg.user_id).toBe('requester-9')
    expect(upsertArg.church_id).toBe('church-approve')
    expect(upsertArg.role).toBe('member')
  })

  it('reject marks the request but does NOT grant membership', async () => {
    mockAuth('super_admin', 'church-reject')
    mockChain.single.mockResolvedValueOnce({
      data: { id: VALID_UUID, profile_id: 'requester-9', status: 'rejected' },
      error: null,
    })

    const res = await PATCH(makeReq('PATCH', { request_id: VALID_UUID, action: 'rejected' }))
    expect(res.status).toBe(200)

    // No membership was granted on rejection.
    expect(mockChain.upsert).not.toHaveBeenCalled()
    const json = await res.json()
    expect(json.data.status).toBe('rejected')
  })

  it('scopes the request UPDATE to the caller church_id (cross-church approval blocked)', async () => {
    mockAuth('super_admin', 'church-mine')
    const eqCalls: Array<[string, unknown]> = []
    mockChain.eq.mockImplementation((col: string, val: unknown) => {
      eqCalls.push([col, val])
      return mockChain
    })
    // Request belongs to a different church -> scoped query returns nothing.
    mockChain.single.mockResolvedValueOnce({ data: null, error: null })

    const res = await PATCH(makeReq('PATCH', { request_id: VALID_UUID, action: 'approved' }))

    // The update was scoped to the caller's own church + id + still-pending.
    expect(eqCalls).toContainEqual(['church_id', 'church-mine'])
    expect(eqCalls).toContainEqual(['id', VALID_UUID])
    expect(eqCalls).toContainEqual(['status', 'pending'])
    // Not found -> 404, and no membership granted.
    expect(res.status).toBe(404)
    expect(mockChain.upsert).not.toHaveBeenCalled()
  })
})
