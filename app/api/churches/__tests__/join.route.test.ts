import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase chainable mock ─────────────────────────────────────────────────
const chainMethods = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'in', 'is', 'order', 'range', 'limit',
]
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) mockChain[m] = vi.fn(() => mockChain)
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
mockChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

// insert() (the request insert) is awaited directly — make it thenable.
let insertResult: { error: unknown } = { error: null }
mockChain.insert = vi.fn(() => {
  const p = Promise.resolve(insertResult)
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
function mockAuth(role = 'member', churchId = 'home-church') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'u@test.com' } },
    error: null,
  })
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role, status: 'active' }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

const TARGET_CHURCH = '22222222-2222-4222-8222-222222222222'

const makeReq = (body: object) =>
  new NextRequest('http://localhost/api/churches/join', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

import { POST } from '@/app/api/churches/join/route'

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
  mockChain.single.mockResolvedValue({ data: null, error: null })
  mockChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  insertResult = { error: null }
  mockChain.insert.mockImplementation(() => Object.assign(Promise.resolve(insertResult), mockChain))
})

describe('POST /api/churches/join — subsequent (already onboarded) join', () => {
  it('creates a PENDING join request instead of an instant membership', async () => {
    mockAuth('member')
    // After the 3 auth .single() calls:
    //  4th: church-exists lookup
    //  5th: profile.onboarding_completed (already onboarded)
    //  6th: requester snapshot (me)
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TARGET_CHURCH }, error: null })          // church active
      .mockResolvedValueOnce({ data: { onboarding_completed: true }, error: null }) // onboarded
      .mockResolvedValueOnce({ data: { first_name: 'A', last_name: 'B' }, error: null }) // snapshot
    // Not already a member, no existing request.
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // existing membership
      .mockResolvedValueOnce({ data: null, error: null }) // existing pending request

    const res = await POST(makeReq({ church_id: TARGET_CHURCH }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('pending')

    // A church_join_request row was inserted for THIS user + target church, as pending.
    expect(mockChain.insert).toHaveBeenCalledTimes(1)
    const insertArg = mockChain.insert.mock.calls[0][0] as Record<string, unknown>
    expect(insertArg.church_id).toBe(TARGET_CHURCH)
    expect(insertArg.profile_id).toBe('user-1')
    expect(insertArg.status).toBe('pending')

    // No instant user_churches membership was created.
    const insertedTables = mockChain.insert.mock.calls.map(() => 'church_join_requests')
    expect(insertedTables).not.toContain('user_churches')
  })

  it('returns 409 when already a member of the target church (no duplicate)', async () => {
    mockAuth('member')
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TARGET_CHURCH }, error: null })          // church active
      .mockResolvedValueOnce({ data: { onboarding_completed: true }, error: null }) // onboarded
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }) // already a member

    const res = await POST(makeReq({ church_id: TARGET_CHURCH }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already a member/i)
    // No request inserted on the duplicate path.
    expect(mockChain.insert).not.toHaveBeenCalled()
  })

  it('returns 409 when a pending request already exists (no duplicate request)', async () => {
    mockAuth('member')
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TARGET_CHURCH }, error: null })
      .mockResolvedValueOnce({ data: { onboarding_completed: true }, error: null })
    mockChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })            // not a member
      .mockResolvedValueOnce({ data: { id: 'existing-req' }, error: null }) // pending exists

    const res = await POST(makeReq({ church_id: TARGET_CHURCH }))
    expect(res.status).toBe(409)
    expect(mockChain.insert).not.toHaveBeenCalled()
  })

  it('returns 404 when the target church does not exist / is inactive', async () => {
    mockAuth('member')
    mockChain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

    const res = await POST(makeReq({ church_id: TARGET_CHURCH }))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/churches/join — first join (during onboarding)', () => {
  it('grants an active membership immediately (not a request)', async () => {
    mockAuth('member')
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TARGET_CHURCH }, error: null })            // church active
      .mockResolvedValueOnce({ data: { onboarding_completed: false }, error: null })  // NOT onboarded
    // delete() and insert() and update() are awaited in the onboarding branch.
    mockChain.delete.mockImplementationOnce(() => Object.assign(Promise.resolve({ error: null }), mockChain))
    mockChain.update.mockImplementationOnce(() => Object.assign(Promise.resolve({ error: null }), mockChain))

    const res = await POST(makeReq({ church_id: TARGET_CHURCH }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('active')

    // The real membership was inserted into user_churches for this user.
    expect(mockChain.insert).toHaveBeenCalledTimes(1)
    const insertArg = mockChain.insert.mock.calls[0][0] as Record<string, unknown>
    expect(insertArg.user_id).toBe('user-1')
    expect(insertArg.church_id).toBe(TARGET_CHURCH)
    expect(insertArg.role).toBe('member')
  })
})
