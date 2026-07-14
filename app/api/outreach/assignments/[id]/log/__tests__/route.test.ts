import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── User-bound supabase chainable mock ──────────────────────────────────────
const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'is', 'order', 'range', 'limit']
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) mockChain[m] = vi.fn(() => mockChain)
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
mockChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

const mockGetUser = vi.fn()

// ── Admin client mock ────────────────────────────────────────────────────────
// insert().select().single() resolves adminSingle; update().eq().eq() is awaited
// as a bare chain, so the chain is thenable and resolves adminUpdateResult.
let adminUpdateResult: { error: unknown } = { error: null }
const adminChain: Record<string, unknown> = {}
for (const m of ['select', 'insert', 'update', 'eq', 'in', 'order', 'limit']) {
  adminChain[m] = vi.fn(() => adminChain)
}
const adminSingle = vi.fn().mockResolvedValue({ data: null, error: null })
adminChain.single = adminSingle
adminChain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
  Promise.resolve(adminUpdateResult).then(resolve, reject)
const adminFrom = vi.fn(() => adminChain)

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => mockChain),
  })),
  createAdminClient: vi.fn(async () => ({ from: adminFrom })),
}))

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  checkRateLimitAsync: vi.fn().mockResolvedValue(null),
}))
const mockRevalidateTag = vi.fn()
vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
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

/** Queue the 4th .single() — the assignment ownership lookup. */
function mockAssignment(assignment: Record<string, unknown> | null) {
  mockChain.single.mockResolvedValueOnce({ data: assignment, error: assignment ? null : { message: 'not found' } })
}

const makeReq = (body: object = { visit_date: '2026-07-11' }) =>
  new NextRequest('http://localhost/api/outreach/assignments/a-1/log', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

const routeCtx = { params: Promise.resolve({ id: 'a-1' }) }

import { POST } from '@/app/api/outreach/assignments/[id]/log/route'

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
  mockChain.single.mockResolvedValue({ data: null, error: null })
  mockChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  for (const m of ['select', 'insert', 'update', 'eq', 'in', 'order', 'limit']) {
    ;(adminChain[m] as ReturnType<typeof vi.fn>).mockReturnValue(adminChain)
  }
  adminSingle.mockResolvedValue({ data: null, error: null })
  adminUpdateResult = { error: null }
})

describe('POST /api/outreach/assignments/[id]/log', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })
    const res = await POST(makeReq(), routeCtx)
    expect(res.status).toBe(401)
  })

  it('returns 404 when the assignment does not exist in the caller church (cross-church scoping)', async () => {
    mockAuth('member', 'home-church')
    mockAssignment(null) // id + church_id filtered lookup found nothing
    const res = await POST(makeReq(), routeCtx)
    expect(res.status).toBe(404)
    // The ownership lookup was scoped by church
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'a-1')
    expect(mockChain.eq).toHaveBeenCalledWith('church_id', 'home-church')
    // Nothing was written
    expect(adminFrom).not.toHaveBeenCalled()
  })

  it('returns 403 when the assignment is not mine', async () => {
    mockAuth('member', 'home-church')
    mockAssignment({ id: 'a-1', member_id: 'm-1', assigned_to: 'someone-else', status: 'pending' })
    const res = await POST(makeReq(), routeCtx)
    expect(res.status).toBe(403)
    expect(adminFrom).not.toHaveBeenCalled()
  })

  it('returns 409 when the assignment is already completed', async () => {
    mockAuth('member', 'home-church')
    mockAssignment({ id: 'a-1', member_id: 'm-1', assigned_to: 'user-1', status: 'completed' })
    const res = await POST(makeReq(), routeCtx)
    expect(res.status).toBe(409)
    expect(adminFrom).not.toHaveBeenCalled()
  })

  it('logs the visit and flips the assignment to completed on success', async () => {
    mockAuth('member', 'home-church')
    mockAssignment({ id: 'a-1', member_id: 'm-1', assigned_to: 'user-1', status: 'pending' })
    adminSingle.mockResolvedValueOnce({
      data: { id: 'v-1', church_id: 'home-church', profile_id: 'm-1', visited_by: 'user-1', visit_date: '2026-07-11' },
      error: null,
    })

    const res = await POST(makeReq({ visit_date: '2026-07-11', notes: 'great visit', needs_followup: true }), routeCtx)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.id).toBe('v-1')

    // Visit row is derived server-side: person visited = assignment.member_id,
    // visitor = caller, church = caller's church.
    expect(adminChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      church_id: 'home-church',
      profile_id: 'm-1',
      visited_by: 'user-1',
      visit_date: '2026-07-11',
      notes: 'great visit',
      needs_followup: true,
    }))

    // Assignment marked done, scoped by id + church_id.
    expect(adminChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
    expect(adminChain.eq).toHaveBeenCalledWith('id', 'a-1')
    expect(adminChain.eq).toHaveBeenCalledWith('church_id', 'home-church')

    expect(mockRevalidateTag).toHaveBeenCalledWith('outreach-home-church')
    expect(mockRevalidateTag).toHaveBeenCalledWith('dashboard-home-church')
  })

  it('rejects an invalid body with 422', async () => {
    mockAuth('member', 'home-church')
    const res = await POST(makeReq({ needs_followup: 'yes' }), routeCtx)
    expect(res.status).toBe(422)
  })
})
