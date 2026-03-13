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

// Make .order() and .range() thenable (for await at end of chain)
for (const m of ['order', 'range']) {
  mockChain[m].mockImplementation(() => {
    const p = Promise.resolve({ data: [], error: null, count: 0 })
    return Object.assign(p, mockChain)
  })
}

const mockGetUser = vi.fn()
const mockProfileSingle = vi.fn()

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

function mockAuth(role = 'super_admin', churchId = 'church-fin-test') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  // profiles query → user_churches query → role_permission_defaults query
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
}

const makeReq = (method = 'GET', body?: object, query = '') =>
  new NextRequest(`http://localhost/api/finance/donations${query}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Import route handlers (after mocks) ─────────────────────────────────────

import { GET, POST } from '@/app/api/finance/donations/route'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/finance/donations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chain methods
    for (const m of chainMethods) {
      mockChain[m].mockReturnValue(mockChain)
    }
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

  describe('GET — permission enforcement', () => {
    it('returns 403 when member role lacks can_view_finances', async () => {
      mockAuth('member')
      const res = await GET(makeReq())
      expect(res.status).toBe(403)
    })

    it('returns 200 for super_admin', async () => {
      mockAuth('super_admin')
      const res = await GET(makeReq())
      expect(res.status).toBe(200)
    })
  })

  describe('GET — church_id isolation', () => {
    it('queries ONLY the authenticated user church', async () => {
      const myChurch = 'church-mine-123'
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

  describe('POST — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await POST(makeReq('POST', { amount: 500, donation_date: '2026-01-01' }))
      expect(res.status).toBe(401)
    })
  })

  describe('POST — permission enforcement', () => {
    it('returns 403 when member role lacks can_manage_finances', async () => {
      mockAuth('member')
      const res = await POST(makeReq('POST', {
        amount: 500,
        donation_date: '2026-01-01',
      }))
      expect(res.status).toBe(403)
    })
  })

  describe('POST — validation', () => {
    it('returns 422 for zero amount', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', {
        amount: 0,
        donation_date: '2026-01-01',
      }))
      expect(res.status).toBe(422)
    })

    it('returns 422 for negative amount', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', {
        amount: -100,
        donation_date: '2026-01-01',
      }))
      expect(res.status).toBe(422)
    })

    it('returns 422 for missing donation_date', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', {
        amount: 500,
      }))
      expect(res.status).toBe(422)
    })

    it('returns 422 for invalid fund_id UUID', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', {
        amount: 500,
        donation_date: '2026-01-01',
        fund_id: 'not-a-uuid',
      }))
      expect(res.status).toBe(422)
    })
  })

  describe('POST — successful creation', () => {
    it('returns 201 with valid data', async () => {
      mockAuth('super_admin')
      // After auth chain, the insert().select().single() call
      mockChain.single
        .mockResolvedValueOnce({ data: { id: 'user-1', church_id: 'church-fin-test', role: 'super_admin', permissions: null }, error: null })
        .mockResolvedValueOnce({ data: { role: 'super_admin' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 'donation-1', amount: 500 }, error: null })

      const res = await POST(makeReq('POST', {
        amount: 500,
        donation_date: '2026-01-15',
      }))
      expect(res.status).toBe(201)
    })
  })
})
