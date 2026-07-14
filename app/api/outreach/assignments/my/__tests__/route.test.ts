import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── User-bound supabase chainable mock ──────────────────────────────────────
const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'is', 'order', 'range']
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) mockChain[m] = vi.fn(() => mockChain)
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
mockChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

// The route awaits the query at `.limit(n)` — resolve by page size (50 active / 10 completed).
let activeResult: { data: unknown[]; error: unknown } = { data: [], error: null }
let completedResult: { data: unknown[]; error: unknown } = { data: [], error: null }
mockChain.limit = vi.fn((n: number) =>
  Promise.resolve(n === 50 ? activeResult : completedResult)
)

const mockGetUser = vi.fn()

// ── Admin client mock (purpose-bound contact fetch) ─────────────────────────
let adminMembersResult: { data: unknown[]; error: unknown } = { data: [], error: null }
const adminChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of ['select', 'eq']) adminChain[m] = vi.fn(() => adminChain)
adminChain.in = vi.fn(() => Promise.resolve(adminMembersResult))
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

const makeReq = () => new NextRequest('http://localhost/api/outreach/assignments/my')

import { GET } from '@/app/api/outreach/assignments/my/route'

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
  mockChain.single.mockResolvedValue({ data: null, error: null })
  mockChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  mockChain.limit.mockImplementation((n: number) =>
    Promise.resolve(n === 50 ? activeResult : completedResult)
  )
  for (const m of ['select', 'eq']) adminChain[m].mockReturnValue(adminChain)
  adminChain.in.mockImplementation(() => Promise.resolve(adminMembersResult))
  activeResult = { data: [], error: null }
  completedResult = { data: [], error: null }
  adminMembersResult = { data: [], error: null }
})

describe('GET /api/outreach/assignments/my', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })
    const res = await GET(makeReq(), undefined)
    expect(res.status).toBe(401)
  })

  it('scopes the query to the caller (assigned_to = me AND church_id = my church)', async () => {
    mockAuth('member', 'home-church')
    activeResult = {
      data: [{ id: 'a-1', member_id: 'm-1', notes: 'go visit', status: 'pending', created_at: 'x', updated_at: 'x' }],
      error: null,
    }
    adminMembersResult = {
      data: [{
        id: 'm-1', first_name: 'Mina', last_name: 'S', first_name_ar: 'مينا', last_name_ar: 'س',
        phone: '0100', address: 'Street 1', address_ar: null, city: 'Cairo', city_ar: null, address_notes: null,
      }],
      error: null,
    }

    const res = await GET(makeReq(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()

    // Own-rows scoping on the user-bound query
    expect(mockChain.eq).toHaveBeenCalledWith('assigned_to', 'user-1')
    expect(mockChain.eq).toHaveBeenCalledWith('church_id', 'home-church')

    // Admin contact fetch is limited to the members on MY assignments, same church
    expect(adminChain.eq).toHaveBeenCalledWith('church_id', 'home-church')
    expect(adminChain.in).toHaveBeenCalledWith('id', ['m-1'])

    // Contact info merged onto the assignment (purpose-bound disclosure)
    expect(json.active).toHaveLength(1)
    expect(json.active[0].member.phone).toBe('0100')
    expect(json.active[0].notes).toBe('go visit')
  })

  it('returns active and completed buckets and never queries profiles when there are no assignments', async () => {
    mockAuth('member', 'home-church')
    const res = await GET(makeReq(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.active).toEqual([])
    expect(json.completed).toEqual([])
    // No assignments → no admin-client profile disclosure at all
    expect(adminFrom).not.toHaveBeenCalled()
  })

  it('splits statuses: pending/in_progress are requested for active, completed separately', async () => {
    mockAuth('member', 'home-church')
    completedResult = {
      data: [{ id: 'a-9', member_id: 'm-2', notes: null, status: 'completed', created_at: 'x', updated_at: 'y' }],
      error: null,
    }
    adminMembersResult = { data: [{ id: 'm-2', first_name: 'B', last_name: null, first_name_ar: null, last_name_ar: null, phone: null, address: null, address_ar: null, city: null, city_ar: null, address_notes: null }], error: null }

    const res = await GET(makeReq(), undefined)
    const json = await res.json()
    expect(mockChain.in).toHaveBeenCalledWith('status', ['pending', 'in_progress'])
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'completed')
    expect(json.completed).toHaveLength(1)
    expect(json.completed[0].member.id).toBe('m-2')
  })
})
