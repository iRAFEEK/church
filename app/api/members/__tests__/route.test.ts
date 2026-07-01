import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Chains ──────────────────────────────────────────────────────────────────
// Two clients: the regular client (apiHandler auth/permissions) and the admin
// client (the route's own logic — dedupe, createUser, inserts).
const chainMethods = ['select', 'insert', 'update', 'upsert', 'eq', 'neq', 'in', 'is', 'order', 'range', 'limit']

const authChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) authChain[m] = vi.fn(() => authChain)
authChain.single = vi.fn()
authChain.maybeSingle = vi.fn()

// The admin chain is thenable: `await chain` (terminal insert/update/upsert/select)
// shifts the next queued result; `.maybeSingle()` resolves separately.
let adminThenQueue: Array<{ data?: unknown; error: unknown }> = []
const adminChain: Record<string, unknown> = {}
for (const m of chainMethods) adminChain[m] = vi.fn(() => adminChain)
adminChain.maybeSingle = vi.fn()
adminChain.single = vi.fn()
;(adminChain as { then: unknown }).then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
  const v = adminThenQueue.length ? adminThenQueue.shift() : { data: [], error: null }
  return Promise.resolve(v).then(resolve, reject)
}

const mockGetUser = vi.fn()
const mockCreateUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: vi.fn(() => authChain) })),
  createAdminClient: vi.fn(async () => ({
    auth: { admin: { createUser: mockCreateUser } },
    from: vi.fn(() => adminChain),
  })),
}))
vi.mock('@/lib/auth', () => ({
  resolveApiPermissions: vi.fn().mockResolvedValue({}),
  isActiveMembership: (s: string | null | undefined) => s == null || s === 'active',
}))
vi.mock('@/lib/messaging/triggers', () => ({ notifyChurchInvitation: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  checkRateLimitAsync: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn(), unstable_cache: vi.fn((fn: unknown) => fn) }))

function mockAuth(role = 'super_admin', churchId = 'church-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'a@t.com' } }, error: null })
  authChain.single
    .mockResolvedValueOnce({ data: { id: 'admin-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

const makeReq = (body?: object) =>
  new NextRequest('http://localhost/api/members', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

import { POST as addMember } from '@/app/api/members/route'
import { POST as claim } from '@/app/api/members/claim/route'
import { notifyChurchInvitation } from '@/lib/messaging/triggers'

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) {
    authChain[m].mockReturnValue(authChain)
    ;(adminChain[m] as ReturnType<typeof vi.fn>).mockReturnValue(adminChain)
  }
  authChain.single.mockResolvedValue({ data: null, error: null })
  authChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
  ;(adminChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
  adminThenQueue = []
})

describe('POST /api/members (leader-add)', () => {
  it('rejects a regular member (only approvers can add)', async () => {
    mockAuth('member')
    const res = await addMember(makeReq({ first_name: 'A', last_name: 'B' }))
    expect(res.status).toBe(403)
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('blocks a ministry_leader from minting a leader role (SEC-1)', async () => {
    mockAuth('ministry_leader')
    const res = await addMember(makeReq({ first_name: 'A', last_name: 'B', role: 'ministry_leader' }))
    expect(res.status).toBe(403)
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('lets a super_admin seed a member with a leader role', async () => {
    mockAuth('super_admin')
    ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: null, error: null })
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-2' } }, error: null })
    adminThenQueue.push({ error: null }) // profiles update
    adminThenQueue.push({ error: null }) // user_churches upsert
    const res = await addMember(makeReq({ first_name: 'A', last_name: 'B', phone: '+201222222222', role: 'group_leader' }))
    expect(res.status).toBe(201)
  })

  it('creates a new claimable shadow identity with a managed membership', async () => {
    mockAuth('super_admin')
    ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: null, error: null }) // dedupe: phone unknown
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-1' } }, error: null })
    adminThenQueue.push({ error: null }) // profiles update
    adminThenQueue.push({ error: null }) // user_churches upsert -> managed

    const res = await addMember(makeReq({ first_name: 'Mina', last_name: 'Adel', phone: '+201111111111' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.added).toBe('created')
    expect(json.data.claimable).toBe(true)
    expect(mockCreateUser).toHaveBeenCalledTimes(1)
  })

  it('invites (not silently adds) an existing person from another church — consent required', async () => {
    mockAuth('ministry_leader')
    ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { id: 'exist-1', church_id: 'other-church' }, error: null }) // dedupe found
      .mockResolvedValueOnce({ data: null, error: null }) // not yet a member here
    adminThenQueue.push({ error: null }) // user_churches insert (status: 'invited')

    const res = await addMember(makeReq({ first_name: 'Mina', last_name: 'Adel', phone: '+201111111111' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.added).toBe('invited')
    expect(mockCreateUser).not.toHaveBeenCalled()
    // The invited person is notified so they can accept/decline.
    expect(notifyChurchInvitation).toHaveBeenCalledWith('exist-1', 'church-1')
  })

  it('returns 409 when the phone already belongs to a member of this church', async () => {
    mockAuth('super_admin')
    ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { id: 'exist-1', church_id: 'church-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'm-1', status: 'active' }, error: null }) // already a member
    const res = await addMember(makeReq({ first_name: 'Mina', last_name: 'Adel', phone: '+201111111111' }))
    expect(res.status).toBe(409)
    expect(mockCreateUser).not.toHaveBeenCalled()
  })
})

describe('POST /api/members/claim', () => {
  it('flips the caller’s managed memberships to active', async () => {
    mockAuth('member')
    adminThenQueue.push({ data: [{ church_id: 'church-1' }], error: null }) // update().eq().eq().select()
    ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { phone: '+201111111111', phone_verified_at: null },
      error: null,
    })
    adminThenQueue.push({ error: null }) // phone_verified_at stamp

    const res = await claim(makeReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.claimed).toBe(1)
  })

  it('is idempotent — claims nothing when there are no managed rows', async () => {
    mockAuth('member')
    adminThenQueue.push({ data: [], error: null }) // nothing managed
    ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { phone: null, phone_verified_at: null },
      error: null,
    })
    const res = await claim(makeReq())
    const json = await res.json()
    expect(json.data.claimed).toBe(0)
  })

  it('only ever activates managed rows — never invited (cross-church consent preserved)', async () => {
    mockAuth('member')
    adminThenQueue.push({ data: [], error: null }) // update()...select()
    ;(adminChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { phone: null, phone_verified_at: null },
      error: null,
    })

    await claim(makeReq())

    // The claim update is scoped to status='managed', so 'invited' rows stay put.
    expect(adminChain.eq).toHaveBeenCalledWith('status', 'managed')
    expect(adminChain.eq).not.toHaveBeenCalledWith('status', 'invited')
  })
})
