import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Two Supabase clients ────────────────────────────────────────────────────
// authChain: apiHandler auth resolution (getUser + profile/user_churches/role).
// adminChain: the route's own service-role client (createAdminClient) that performs
// the pending->active flip on churches.
const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'is', 'order', 'range', 'limit']

const authChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) authChain[m] = vi.fn(() => authChain)
authChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
authChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

const adminChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) adminChain[m] = vi.fn(() => adminChain)
let adminSingleResult: { data?: unknown; error: unknown } = { data: null, error: null }
adminChain.single = vi.fn(() => Promise.resolve(adminSingleResult))
adminChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: vi.fn(() => authChain) })),
  createAdminClient: vi.fn(async () => ({ from: vi.fn(() => adminChain) })),
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

// NOTE: we deliberately do NOT mock '@/lib/platform' — we exercise the real
// isPlatformAdmin() against process.env.PLATFORM_ADMIN_EMAILS, so the allow/deny
// gate is genuinely tested end-to-end.

// ── Helpers ─────────────────────────────────────────────────────────────────
// email is what drives the platform allowlist; role is irrelevant to the gate.
function mockAuth(email: string, role = 'super_admin') {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1', email } }, error: null })
  authChain.single
    .mockResolvedValueOnce({ data: { id: 'u-1', church_id: 'church-1', role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role, status: 'active' }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

const PENDING_CHURCH = '33333333-3333-4333-8333-333333333333'

const makeReq = (body: object) =>
  new NextRequest('http://localhost/api/platform/churches', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

import { PATCH } from '@/app/api/platform/churches/route'

const ORIGINAL_ALLOWLIST = process.env.PLATFORM_ADMIN_EMAILS

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) {
    authChain[m].mockReturnValue(authChain)
    adminChain[m].mockReturnValue(adminChain)
  }
  authChain.single.mockResolvedValue({ data: null, error: null })
  authChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  adminSingleResult = { data: null, error: null }
  adminChain.single.mockImplementation(() => Promise.resolve(adminSingleResult))
  process.env.PLATFORM_ADMIN_EMAILS = 'ops@ekklesia.app, boss@ekklesia.app'
})

afterEach(() => {
  process.env.PLATFORM_ADMIN_EMAILS = ORIGINAL_ALLOWLIST
})

describe('PATCH /api/platform/churches — allowlist gate', () => {
  it('returns 401 for an unauthenticated request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'approve' }))
    expect(res.status).toBe(401)
  })

  it('forbids a normal super_admin NOT on the platform allowlist (403)', async () => {
    mockAuth('notplatform@somechurch.org', 'super_admin')
    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'approve' }))
    expect(res.status).toBe(403)
    // Gate fires before any DB write.
    expect(adminChain.update).not.toHaveBeenCalled()
  })

  it('allows an email on the allowlist to approve', async () => {
    mockAuth('ops@ekklesia.app')
    adminSingleResult = {
      data: { id: PENDING_CHURCH, name: 'New Church', name_ar: 'كنيسة', status: 'active', is_active: true },
      error: null,
    }
    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'approve' }))
    expect(res.status).toBe(200)
  })

  it('matches the allowlist case-insensitively', async () => {
    mockAuth('OPS@Ekklesia.App')
    adminSingleResult = {
      data: { id: PENDING_CHURCH, name: 'X', name_ar: 'X', status: 'active', is_active: true },
      error: null,
    }
    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'approve' }))
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/platform/churches — approval state change', () => {
  it('approve flips status to active + is_active, scoped to status=pending', async () => {
    mockAuth('ops@ekklesia.app')
    const eqCalls: Array<[string, unknown]> = []
    adminChain.eq.mockImplementation((col: string, val: unknown) => {
      eqCalls.push([col, val])
      return adminChain
    })
    adminSingleResult = {
      data: { id: PENDING_CHURCH, name: 'N', name_ar: 'N', status: 'active', is_active: true },
      error: null,
    }

    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'approve' }))
    expect(res.status).toBe(200)

    // The update payload activates the church.
    const updateArg = adminChain.update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.status).toBe('active')
    expect(updateArg.is_active).toBe(true)

    // Scoped to the specific church AND to status='pending' — cannot re-approve/alter
    // a church that is already active.
    expect(eqCalls).toContainEqual(['id', PENDING_CHURCH])
    expect(eqCalls).toContainEqual(['status', 'pending'])
  })

  it('reject sets status=rejected + is_active=false, still scoped to pending', async () => {
    mockAuth('ops@ekklesia.app')
    const eqCalls: Array<[string, unknown]> = []
    adminChain.eq.mockImplementation((col: string, val: unknown) => {
      eqCalls.push([col, val])
      return adminChain
    })
    adminSingleResult = {
      data: { id: PENDING_CHURCH, name: 'N', name_ar: 'N', status: 'rejected', is_active: false },
      error: null,
    }

    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'reject' }))
    expect(res.status).toBe(200)

    const updateArg = adminChain.update.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.status).toBe('rejected')
    expect(updateArg.is_active).toBe(false)
    expect(eqCalls).toContainEqual(['status', 'pending'])
  })

  it('returns 404 when the church is not pending (already reviewed)', async () => {
    mockAuth('ops@ekklesia.app')
    // status='pending' scope matches nothing -> null row.
    adminSingleResult = { data: null, error: null }

    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'approve' }))
    expect(res.status).toBe(404)
  })

  it('returns 422 for an invalid action', async () => {
    mockAuth('ops@ekklesia.app')
    const res = await PATCH(makeReq({ church_id: PENDING_CHURCH, action: 'bogus' }))
    expect(res.status).toBe(422)
    expect(adminChain.update).not.toHaveBeenCalled()
  })
})
