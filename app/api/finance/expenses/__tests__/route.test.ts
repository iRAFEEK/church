import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  makeProfile,
  makeAuthContext,
  makeSupabaseChain,
  makeSupabase,
  makeReq,
} from '@/lib/api/__tests__/fixtures/factories'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRevalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: mockRevalidateTag }))

let mockSupabase: ReturnType<typeof makeSupabase>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// We need the real validate + schema so POST validation is exercised
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/finance/expenses'

/** Wire up the 3-step auth chain that apiHandler performs:
 *  1. supabase.auth.getUser()
 *  2. supabase.from('profiles').select().eq().single()
 *  3. supabase.from('user_churches').select().eq().eq().single()
 *  4. supabase.from('role_permission_defaults').select().eq().eq().single()
 *  Then subsequent .from() calls hit the normal chain for the handler logic.
 */
function wireAuth(
  ctx: ReturnType<typeof makeAuthContext>,
  supabase: ReturnType<typeof makeSupabase>,
) {
  // Step 1 — auth.getUser
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: ctx.user.id, email: ctx.user.email } },
    error: null,
  })

  // Steps 2-4 are .from() calls inside apiHandler before handing off to our handler.
  // The handler itself also calls .from('expense_requests').
  // We track call order via fromCallIndex.
  let fromCallIndex = 0

  const makeChainFor = (resolvedValue: { data: unknown; error: null }) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {}
    const methods = ['select', 'eq', 'neq', 'in', 'order', 'range', 'limit', 'insert', 'update', 'delete', 'upsert']
    for (const m of methods) c[m] = vi.fn().mockReturnValue(c)
    c.single = vi.fn().mockResolvedValue(resolvedValue)
    c.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
    // Allow range/order to be terminal (awaitable) while still chainable
    c.range.mockImplementation(() => {
      const p = Promise.resolve(resolvedValue)
      return Object.assign(p, c)
    })
    c.order.mockImplementation(() => {
      const p = Promise.resolve(resolvedValue)
      return Object.assign(p, c)
    })
    return c
  }

  // Profile chain (step 2)
  const profileChain = makeChainFor({ data: ctx.profile, error: null })

  // user_churches chain (step 3)
  const membershipChain = makeChainFor({
    data: { role: ctx.profile.role },
    error: null,
  })

  // role_permission_defaults chain (step 4)
  const permDefaultsChain = makeChainFor({ data: null, error: null })

  supabase.from.mockImplementation((table: string) => {
    fromCallIndex++
    if (fromCallIndex === 1 && table === 'profiles') return profileChain
    if (fromCallIndex === 2 && table === 'user_churches') return membershipChain
    if (fromCallIndex === 3 && table === 'role_permission_defaults') return permDefaultsChain
    // All subsequent calls are from the handler — return the main chain
    return supabase._chain
  })
}

function wireUnauth(supabase: ReturnType<typeof makeSupabase>) {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'No session' },
  })
}

const validExpenseBody = {
  description: 'Office supplies',
  amount: 500,
  currency: 'EGP',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let GET: (req: Request) => Promise<Response>
let POST: (req: Request) => Promise<Response>

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  mockSupabase = makeSupabase()
  const mod = await import('@/app/api/finance/expenses/route')
  GET = mod.GET as unknown as (req: Request) => Promise<Response>
  POST = mod.POST as unknown as (req: Request) => Promise<Response>
})

// ---- GET -----------------------------------------------------------------

describe('GET /api/finance/expenses', () => {
  it('returns 401 when unauthenticated', async () => {
    wireUnauth(mockSupabase)
    const res = await GET(makeReq(BASE_URL))
    expect(res.status).toBe(401)
  })

  it('returns 403 without can_submit_expenses permission', async () => {
    const ctx = makeAuthContext('member')
    // Override to remove can_submit_expenses
    ctx.resolvedPermissions.can_submit_expenses = false
    // But we need to make apiHandler resolve permissions without can_submit_expenses.
    // The simplest way: use a member role (which by default lacks can_submit_expenses).
    // Let's verify by checking the actual defaults.
    wireAuth(ctx, mockSupabase)
    const res = await GET(makeReq(BASE_URL))
    expect(res.status).toBe(403)
  })

  it('filters by church_id', async () => {
    const ctx = makeAuthContext('super_admin', 'church-abc')
    wireAuth(ctx, mockSupabase)

    // Set up the handler chain to return data
    mockSupabase._chain.eq.mockReturnValue(mockSupabase._chain)
    const result = { data: [], error: null, count: 0 }
    mockSupabase._chain.range.mockImplementation(() => {
      const p = Promise.resolve(result)
      return Object.assign(p, mockSupabase._chain)
    })

    await GET(makeReq(BASE_URL))

    // The handler's .from('expense_requests') call should chain .eq('church_id', ...)
    expect(mockSupabase._chain.eq).toHaveBeenCalledWith('church_id', 'church-abc')
  })

  it('paginates with page and pageSize', async () => {
    const ctx = makeAuthContext('super_admin')
    wireAuth(ctx, mockSupabase)

    const result = { data: [], error: null, count: 50 }
    mockSupabase._chain.range.mockImplementation(() => {
      const p = Promise.resolve(result)
      return Object.assign(p, mockSupabase._chain)
    })

    const res = await GET(makeReq(`${BASE_URL}?page=2&pageSize=10`))
    const json = await res.json()

    expect(mockSupabase._chain.range).toHaveBeenCalledWith(10, 19)
    expect(json.page).toBe(2)
    expect(json.pageSize).toBe(10)
    expect(json.totalPages).toBe(5)
  })

  it('with mine=true filters to user own expenses', async () => {
    const ctx = makeAuthContext('super_admin')
    wireAuth(ctx, mockSupabase)

    const result = { data: [], error: null, count: 0 }
    mockSupabase._chain.range.mockImplementation(() => {
      const p = Promise.resolve(result)
      return Object.assign(p, mockSupabase._chain)
    })

    await GET(makeReq(`${BASE_URL}?mine=true`))

    expect(mockSupabase._chain.eq).toHaveBeenCalledWith('requested_by', ctx.user.id)
  })

  it('without can_approve_expenses shows only own expenses', async () => {
    // group_leader has can_submit_expenses but not can_approve_expenses
    const ctx = makeAuthContext('group_leader')
    wireAuth(ctx, mockSupabase)

    const result = { data: [], error: null, count: 0 }
    mockSupabase._chain.range.mockImplementation(() => {
      const p = Promise.resolve(result)
      return Object.assign(p, mockSupabase._chain)
    })

    await GET(makeReq(BASE_URL))

    expect(mockSupabase._chain.eq).toHaveBeenCalledWith('requested_by', ctx.user.id)
  })

  it('supports status filter', async () => {
    const ctx = makeAuthContext('super_admin')
    wireAuth(ctx, mockSupabase)

    const result = { data: [], error: null, count: 0 }
    mockSupabase._chain.range.mockImplementation(() => {
      const p = Promise.resolve(result)
      return Object.assign(p, mockSupabase._chain)
    })

    await GET(makeReq(`${BASE_URL}?status=approved`))

    expect(mockSupabase._chain.eq).toHaveBeenCalledWith('status', 'approved')
  })
})

// ---- POST ----------------------------------------------------------------

describe('POST /api/finance/expenses', () => {
  it('returns 401 when unauthenticated', async () => {
    wireUnauth(mockSupabase)
    const res = await POST(makeReq(BASE_URL, 'POST', validExpenseBody))
    expect(res.status).toBe(401)
  })

  it('returns 422 with invalid body', async () => {
    const ctx = makeAuthContext('super_admin')
    wireAuth(ctx, mockSupabase)

    const res = await POST(makeReq(BASE_URL, 'POST', { amount: -5 }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('sets status to submitted', async () => {
    const ctx = makeAuthContext('super_admin')
    wireAuth(ctx, mockSupabase)

    const inserted = { id: 'exp-1', ...validExpenseBody, status: 'submitted' }
    mockSupabase._chain.single.mockResolvedValue({ data: inserted, error: null })

    await POST(makeReq(BASE_URL, 'POST', validExpenseBody))

    expect(mockSupabase._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'submitted' }),
    )
  })

  it('sets requested_by to user.id', async () => {
    const ctx = makeAuthContext('super_admin')
    wireAuth(ctx, mockSupabase)

    const inserted = { id: 'exp-1', ...validExpenseBody, status: 'submitted' }
    mockSupabase._chain.single.mockResolvedValue({ data: inserted, error: null })

    await POST(makeReq(BASE_URL, 'POST', validExpenseBody))

    expect(mockSupabase._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ requested_by: ctx.user.id }),
    )
  })

  it('revalidates dashboard cache after success', async () => {
    const ctx = makeAuthContext('super_admin', 'church-xyz')
    wireAuth(ctx, mockSupabase)

    const inserted = { id: 'exp-1', ...validExpenseBody, status: 'submitted' }
    mockSupabase._chain.single.mockResolvedValue({ data: inserted, error: null })

    await POST(makeReq(BASE_URL, 'POST', validExpenseBody))

    expect(mockRevalidateTag).toHaveBeenCalledWith('dashboard-church-xyz')
  })
})
