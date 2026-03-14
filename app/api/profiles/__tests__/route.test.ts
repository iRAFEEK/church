import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(mockChain),
  })),
}))

vi.mock('@/lib/utils/normalize', () => ({
  normalizeSearch: vi.fn((s: string) => s),
}))

vi.mock('@/lib/auth', () => ({
  resolveApiPermissions: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockAuth(role = 'super_admin', churchId = 'church-profile-test') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'admin@test.com' } },
    error: null,
  })
  // apiHandler calls .single() 3 times: profile, user_churches, role_permission_defaults
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: { permissions: null }, error: null })
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'No user' },
  })
}

const makeReq = (url: string, method = 'GET', body?: object) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Imports ─────────────────────────────────────────────────────────────────

import { GET as listProfiles } from '@/app/api/profiles/route'
import { GET as getProfile, PATCH as patchProfile } from '@/app/api/profiles/[id]/route'
import { GET as getAtRisk } from '@/app/api/profiles/at-risk/route'

// ── Reset ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
  for (const m of ['order', 'range']) {
    mockChain[m].mockImplementation(() => {
      const p = Promise.resolve({ data: [], error: null, count: 0 })
      return Object.assign(p, mockChain)
    })
  }
  mockChain.single.mockResolvedValue({ data: null, error: null })
})

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/profiles', () => {
  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await listProfiles(makeReq('/api/profiles'))
      expect(res.status).toBe(401)
    })
  })

  describe('GET — church_id isolation', () => {
    it('filters results by the authenticated user church_id', async () => {
      const myChurch = 'church-abc-123'
      mockAuth('super_admin', myChurch)

      let capturedChurchId: string | undefined
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        if (col === 'church_id') capturedChurchId = val as string
        return mockChain
      })

      await listProfiles(makeReq('/api/profiles'))
      expect(capturedChurchId).toBe(myChurch)
    })
  })

  describe('GET — search query', () => {
    it('applies or() filter when q param is provided', async () => {
      mockAuth('super_admin')

      await listProfiles(makeReq('/api/profiles?q=john'))
      expect(mockChain.or).toHaveBeenCalled()
      const orArg = mockChain.or.mock.calls[0][0] as string
      expect(orArg).toContain('john')
    })
  })

  describe('GET — pagination', () => {
    it('passes correct range for page 2 with default pageSize', async () => {
      mockAuth('super_admin')

      await listProfiles(makeReq('/api/profiles?page=2'))
      // page=2 with default pageSize=25 => range(25, 49)
      expect(mockChain.range).toHaveBeenCalledWith(25, 49)
    })
  })
})

describe('/api/profiles/[id]', () => {
  const paramsFor = (id: string) => Promise.resolve({ id })

  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await getProfile(
        makeReq('/api/profiles/user-1'),
        { params: paramsFor('user-1') },
      )
      expect(res.status).toBe(401)
    })
  })

  describe('GET — returns profile within same church', () => {
    it('returns 200 when admin fetches a profile in same church', async () => {
      mockAuth('super_admin', 'church-same')

      // Second .single() call returns the fetched profile
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'target-user', church_id: 'church-same', first_name: 'Test' },
        error: null,
      })

      const res = await getProfile(
        makeReq('/api/profiles/target-user'),
        { params: paramsFor('target-user') },
      )
      expect(res.status).toBe(200)
    })
  })

  describe('PATCH — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await patchProfile(
        makeReq('/api/profiles/user-1', 'PATCH', { first_name: 'New' }),
        { params: paramsFor('user-1') },
      )
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH — church_id isolation', () => {
    it('updates only within the authenticated user church', async () => {
      const myChurch = 'church-isolated'
      mockAuth('super_admin', myChurch)

      const capturedEqCalls: Array<[string, unknown]> = []
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        capturedEqCalls.push([col, val])
        return mockChain
      })

      // The update().eq().eq().select().single() chain
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'user-1', church_id: myChurch, first_name: 'Updated' },
        error: null,
      })

      await patchProfile(
        makeReq('/api/profiles/user-1', 'PATCH', { first_name: 'Updated' }),
        { params: paramsFor('user-1') },
      )

      // Verify church_id was used in the update query
      const churchIdCalls = capturedEqCalls.filter(([col]) => col === 'church_id')
      expect(churchIdCalls.length).toBeGreaterThanOrEqual(1)
      expect(churchIdCalls.some(([, val]) => val === myChurch)).toBe(true)
    })
  })
})

describe('/api/profiles/at-risk', () => {
  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await getAtRisk(makeReq('/api/profiles/at-risk'))
      expect(res.status).toBe(401)
    })
  })

  describe('GET — church_id isolation', () => {
    it('filters at-risk profiles by the authenticated user church_id', async () => {
      const myChurch = 'church-at-risk-test'
      mockAuth('super_admin', myChurch)

      const capturedEqCalls: Array<[string, unknown]> = []
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        capturedEqCalls.push([col, val])
        return mockChain
      })

      // order() is the terminal chain call that resolves
      mockChain.order.mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null })
        return Object.assign(p, mockChain)
      })

      await getAtRisk(makeReq('/api/profiles/at-risk'))

      const churchIdCalls = capturedEqCalls.filter(([col]) => col === 'church_id')
      expect(churchIdCalls.length).toBeGreaterThanOrEqual(1)
      expect(churchIdCalls[0][1]).toBe(myChurch)
    })
  })
})
