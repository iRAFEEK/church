import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

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

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockAuth(role = 'super_admin', churchId = 'church-grp-test') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
}

const makeReq = (method = 'GET', body?: object) =>
  new NextRequest('http://localhost/api/groups', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Import ──────────────────────────────────────────────────────────────────

import { GET, POST } from '@/app/api/groups/route'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/groups', () => {
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

  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await GET(makeReq())
      expect(res.status).toBe(401)
    })
  })

  describe('GET — returns data for authenticated user', () => {
    it('returns 200 for any authenticated user', async () => {
      mockAuth('member')
      const res = await GET(makeReq())
      expect(res.status).toBe(200)
    })
  })

  describe('GET — church_id isolation', () => {
    it('queries ONLY the authenticated user church', async () => {
      const myChurch = 'church-groups-mine'
      mockAuth('super_admin', myChurch)

      let capturedChurchId: string | undefined
      mockChain.eq.mockImplementation((col: string, val: unknown) => {
        if (col === 'church_id') capturedChurchId = val as string
        return mockChain
      })

      await GET(makeReq())
      expect(capturedChurchId).toBe(myChurch)
    })
  })

  describe('POST — permission enforcement', () => {
    it('returns 403 when member lacks can_manage_members permission', async () => {
      mockAuth('member')
      const res = await POST(makeReq('POST', {
        name: 'Test Group',
        type: 'small_group',
      }))
      expect(res.status).toBe(403)
    })
  })

  describe('POST — validation', () => {
    it('returns 422 for missing required name field', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', {
        type: 'small_group',
      }))
      expect(res.status).toBe(422)
    })

    it('returns 422 for invalid group type enum', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', {
        name: 'Test',
        type: 'invalid_type',
      }))
      expect(res.status).toBe(422)
    })

    it('returns 422 for empty name', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', {
        name: '',
        type: 'small_group',
      }))
      expect(res.status).toBe(422)
    })
  })

  describe('POST — successful creation', () => {
    it('returns data with valid input and correct role', async () => {
      mockAuth('super_admin')
      mockChain.single
        .mockResolvedValueOnce({ data: { id: 'user-1', church_id: 'church-grp-test', role: 'super_admin', permissions: null }, error: null })
        .mockResolvedValueOnce({ data: { role: 'super_admin' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 'group-1', name: 'Alpha Group', church_id: 'church-grp-test' }, error: null })

      const res = await POST(makeReq('POST', {
        name: 'Alpha Group',
        type: 'small_group',
      }))
      expect(res.status).toBe(200)
    })
  })
})
