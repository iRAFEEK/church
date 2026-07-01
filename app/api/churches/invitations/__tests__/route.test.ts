import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Chains ──────────────────────────────────────────────────────────────────
// Regular client backs apiHandler auth; admin client backs the route's own logic
// (self-scoped cross-church reads/writes on user_churches).
const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'is', 'order', 'range', 'limit']

const authChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) authChain[m] = vi.fn(() => authChain)
authChain.single = vi.fn()
authChain.maybeSingle = vi.fn()

const adminChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) adminChain[m] = vi.fn(() => adminChain)
adminChain.single = vi.fn()
adminChain.maybeSingle = vi.fn()

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: vi.fn(() => authChain) })),
  createAdminClient: vi.fn(async () => ({ from: vi.fn(() => adminChain) })),
}))
vi.mock('@/lib/auth', () => ({
  resolveApiPermissions: vi.fn().mockResolvedValue({}),
  isActiveMembership: (s: string | null | undefined) => s == null || s === 'active',
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  checkRateLimitAsync: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn(), unstable_cache: vi.fn((fn: unknown) => fn) }))

// The caller is an ACTIVE member of their own church (so apiHandler lets them in).
function mockAuth(userId = 'invitee-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: 'i@t.com' } }, error: null })
  authChain.single
    .mockResolvedValueOnce({ data: { id: userId, church_id: 'home-church', role: 'member', permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role: 'member', status: 'active' }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

const makeReq = (method: string, body?: object) =>
  new NextRequest('http://localhost/api/churches/invitations', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

import { GET, PATCH, DELETE } from '@/app/api/churches/invitations/route'

const CHURCH = '11111111-1111-1111-1111-111111111111'

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) {
    authChain[m].mockReturnValue(authChain)
    adminChain[m].mockReturnValue(adminChain)
  }
  authChain.single.mockResolvedValue({ data: null, error: null })
  authChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  adminChain.single.mockResolvedValue({ data: null, error: null })
  adminChain.maybeSingle.mockResolvedValue({ data: null, error: null })
})

describe('GET /api/churches/invitations', () => {
  it('lists the caller’s own pending invitations, scoped to user_id + status invited', async () => {
    mockAuth('invitee-1')
    // The list query terminates on .limit() (returns a thenable-ish result via order/limit).
    adminChain.limit.mockResolvedValueOnce({
      data: [{ church_id: CHURCH, role: 'member', created_at: '2026-07-01', church: { id: CHURCH, name: 'St Mark', name_ar: 'مار مرقس', country: 'EG' } }],
      error: null,
    })

    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(adminChain.eq).toHaveBeenCalledWith('user_id', 'invitee-1')
    expect(adminChain.eq).toHaveBeenCalledWith('status', 'invited')
  })
})

describe('PATCH /api/churches/invitations (accept)', () => {
  it('flips the caller’s invited row to active and is self-scoped', async () => {
    mockAuth('invitee-1')
    adminChain.single.mockResolvedValueOnce({ data: { church_id: CHURCH }, error: null })

    const res = await PATCH(makeReq('PATCH', { church_id: CHURCH }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.status).toBe('active')
    expect(adminChain.update).toHaveBeenCalledWith({ status: 'active' })
    expect(adminChain.eq).toHaveBeenCalledWith('user_id', 'invitee-1')
    expect(adminChain.eq).toHaveBeenCalledWith('status', 'invited')
  })

  it('returns 404 when there is no matching invited row', async () => {
    mockAuth('invitee-1')
    adminChain.single.mockResolvedValueOnce({ data: null, error: null })

    const res = await PATCH(makeReq('PATCH', { church_id: CHURCH }))
    expect(res.status).toBe(404)
  })

  it('422s on an invalid body', async () => {
    mockAuth('invitee-1')
    const res = await PATCH(makeReq('PATCH', { church_id: 'not-a-uuid' }))
    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/churches/invitations (decline)', () => {
  it('removes the caller’s invited row, self-scoped', async () => {
    mockAuth('invitee-1')
    adminChain.single.mockResolvedValueOnce({ data: { church_id: CHURCH }, error: null })

    const res = await DELETE(makeReq('DELETE', { church_id: CHURCH }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.declined).toBe(true)
    expect(adminChain.delete).toHaveBeenCalled()
    expect(adminChain.eq).toHaveBeenCalledWith('user_id', 'invitee-1')
    expect(adminChain.eq).toHaveBeenCalledWith('status', 'invited')
  })

  it('returns 404 when there is nothing to decline', async () => {
    mockAuth('invitee-1')
    adminChain.single.mockResolvedValueOnce({ data: null, error: null })

    const res = await DELETE(makeReq('DELETE', { church_id: CHURCH }))
    expect(res.status).toBe(404)
  })
})
