import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'

// ── Supabase chainable mock ─────────────────────────────────────────────────
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
const chainMethods = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not',
  'or', 'order', 'range', 'limit', 'throwOnError',
]
for (const m of chainMethods) {
  mockChain[m] = vi.fn().mockReturnValue(mockChain)
}
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })
mockChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

for (const m of ['order', 'range']) {
  mockChain[m].mockImplementation(() => {
    const p = Promise.resolve({ data: [], error: null, count: 0 })
    return Object.assign(p, mockChain)
  })
}

const mockGetUser = vi.fn()
const mockFrom = vi.fn().mockReturnValue(mockChain)
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })

const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  rpc: mockRpc,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

vi.mock('@/lib/auth', () => ({
  resolveApiPermissions: vi.fn().mockResolvedValue({ can_manage_serving: true }),
  getCurrentUserWithRole: vi.fn(),
  requireRole: vi.fn(),
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetChain() {
  mockGetUser.mockReset()
  mockFrom.mockReset()
  mockFrom.mockReturnValue(mockChain)

  for (const m of chainMethods) {
    mockChain[m].mockReset()
    mockChain[m].mockReturnValue(mockChain)
  }
  for (const m of ['order', 'range']) {
    mockChain[m].mockReset()
    mockChain[m].mockImplementation(() => {
      const p = Promise.resolve({ data: [], error: null, count: 0 })
      return Object.assign(p, mockChain)
    })
  }
  mockChain.single.mockReset()
  mockChain.single.mockResolvedValue({ data: null, error: null })
  mockChain.maybeSingle.mockReset()
  mockChain.maybeSingle.mockResolvedValue({ data: null, error: null })
}

function mockAuth(role = 'super_admin', churchId = 'church-serving-test') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  // apiHandler calls .single() 3 times: profile, user_churches, role_permission_defaults
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
}

const makeReq = (url: string, method = 'GET', body?: object) =>
  new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { GET as getSlotsGET, POST as slotsPOST } from '@/app/api/serving/slots/route'
import { POST as signupPOST, DELETE as signupDELETE } from '@/app/api/serving/slots/[id]/signup/route'
import { resolveApiPermissions } from '@/lib/auth'

const mockResolvePerms = vi.mocked(resolveApiPermissions)

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/serving/areas', () => {
  const areasCode = readFileSync('app/api/serving/areas/route.ts', 'utf-8')

  it('uses apiHandler (auth enforced automatically)', () => {
    expect(areasCode).toContain('apiHandler')
    expect(areasCode).not.toContain('supabase.auth.getUser()')
  })

  it('GET filters by church_id', () => {
    expect(areasCode).toContain("eq('church_id', profile.church_id)")
  })

  it('POST requires can_manage_serving permission', () => {
    expect(areasCode).toContain("requirePermissions: ['can_manage_serving']")
  })

  it('POST sets church_id from profile, not from request body', () => {
    expect(areasCode).toContain('church_id: profile.church_id')
  })
})

describe('/api/serving/slots', () => {
  beforeEach(() => {
    resetChain()
    mockResolvePerms.mockReset()
    mockResolvePerms.mockResolvedValue({ can_manage_serving: true } as any)
  })

  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await getSlotsGET(makeReq('http://localhost/api/serving/slots'))
      expect(res.status).toBe(401)
    })
  })

  describe('GET — church_id isolation', () => {
    it('queries ONLY the authenticated user church', async () => {
      const myChurch = 'church-serving-mine'
      mockAuth('member', myChurch)

      let capturedChurchId: string | undefined
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        if (col === 'church_id') capturedChurchId = val as string
        return mockChain
      })

      mockChain.order.mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null })
        return Object.assign(p, mockChain)
      })

      await getSlotsGET(makeReq('http://localhost/api/serving/slots'))
      expect(capturedChurchId).toBe(myChurch)
    })
  })

  describe('GET — date filtering', () => {
    it('applies gte filter when upcoming=true', async () => {
      mockAuth('member')

      mockChain.order.mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null })
        return Object.assign(p, mockChain)
      })

      await getSlotsGET(makeReq('http://localhost/api/serving/slots?upcoming=true'))

      expect(mockChain.gte).toHaveBeenCalledWith('date', expect.any(String))
    })
  })

  describe('POST — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await slotsPOST(makeReq('http://localhost/api/serving/slots', 'POST', {
        serving_area_id: '00000000-0000-0000-0000-000000000001',
        title: 'Usher Slot',
        date: '2026-04-01',
      }))
      expect(res.status).toBe(401)
    })
  })

  describe('POST — permission enforcement', () => {
    it('returns 403 when user lacks can_manage_serving', async () => {
      mockAuth('member')
      mockResolvePerms.mockResolvedValueOnce({ can_manage_serving: false } as any)

      const res = await slotsPOST(makeReq('http://localhost/api/serving/slots', 'POST', {
        serving_area_id: '00000000-0000-0000-0000-000000000001',
        title: 'Usher Slot',
        date: '2026-04-01',
      }))
      expect(res.status).toBe(403)
    })
  })

  describe('POST — sets church_id from profile', () => {
    it('inserts church_id from the authenticated profile, not request body', async () => {
      const myChurch = 'church-serving-mine'
      mockAuth('super_admin', myChurch)
      mockResolvePerms.mockResolvedValueOnce({ can_manage_serving: true } as any)

      let insertPayload: Record<string, unknown> | undefined
      mockChain.insert.mockImplementation((payload: any) => {
        insertPayload = payload
        return mockChain
      })
      // mockAuth consumed the first .single() for profile lookup.
      // The insert().select().single() for the created slot:
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'slot-1', church_id: myChurch, title: 'Usher Slot' },
        error: null,
      })

      await slotsPOST(makeReq('http://localhost/api/serving/slots', 'POST', {
        serving_area_id: '00000000-0000-0000-0000-000000000001',
        title: 'Usher Slot',
        date: '2026-04-01',
        church_id: 'attacker-church-id',
      }))

      expect(insertPayload).toBeDefined()
      expect(insertPayload!.church_id).toBe(myChurch)
    })
  })
})

describe('/api/serving/slots/[id]/signup', () => {
  const slotId = 'slot-test-1'
  const makeParams = () => Promise.resolve({ id: slotId })

  beforeEach(() => {
    resetChain()
  })

  describe('POST — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await signupPOST(
        makeReq('http://localhost/api/serving/slots/slot-test-1/signup', 'POST'),
        { params: makeParams() },
      )
      expect(res.status).toBe(401)
    })
  })

  describe('POST — duplicate prevention (static)', () => {
    it('signup route checks for existing signup and returns Already signed up', async () => {
      const { join } = await import('path')
      const code = readFileSync(join(process.cwd(), 'app/api/serving/slots/[id]/signup/route.ts'), 'utf-8')
      expect(code).toContain('Already signed up')
      expect(code).toContain('409')
    })
  })

  describe('POST — slot capacity enforcement (static)', () => {
    it('signup route checks max_volunteers and returns Slot is full', async () => {
      const { join } = await import('path')
      const code = readFileSync(join(process.cwd(), 'app/api/serving/slots/[id]/signup/route.ts'), 'utf-8')
      expect(code).toContain('max_volunteers')
      expect(code).toContain('Slot is full')
    })
  })

  describe('DELETE — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await signupDELETE(
        makeReq('http://localhost/api/serving/slots/slot-test-1/signup', 'DELETE'),
        { params: makeParams() },
      )
      expect(res.status).toBe(401)
    })
  })

  describe('DELETE — cancels own signup', () => {
    it('sets status to cancelled and returns success', async () => {
      mockAuth('member')

      mockChain.single
        .mockResolvedValueOnce({
          data: { church_id: 'church-serving-test' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'signup-1', status: 'cancelled' },
          error: null,
        })

      const res = await signupDELETE(
        makeReq('http://localhost/api/serving/slots/slot-test-1/signup', 'DELETE'),
        { params: makeParams() },
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
    })
  })
})
