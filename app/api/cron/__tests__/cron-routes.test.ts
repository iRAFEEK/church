import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Cron job tests: all cron routes must
 * 1. Require CRON_SECRET auth (return 401 without it)
 * 2. Return 200 with correct secret
 * 3. Be idempotent (safe to run twice)
 */

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'gte', 'lte', 'lt', 'gt', 'is', 'not', 'or', 'order', 'range', 'limit']
for (const m of methods) {
  mockChain[m] = vi.fn().mockReturnValue(mockChain)
}
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })

// Terminal: return empty arrays
for (const m of ['order', 'range', 'limit']) {
  mockChain[m].mockImplementation(() => {
    const p = Promise.resolve({ data: [], error: null, count: 0 })
    return Object.assign(p, mockChain)
  })
}
// delete with count
mockChain.delete.mockImplementation(() => {
  const chain = { ...mockChain }
  chain.lt = vi.fn().mockResolvedValue({ count: 0, error: null })
  return chain
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(async () => ({
    from: vi.fn().mockReturnValue(mockChain),
  })),
  createClient: vi.fn(async () => ({
    from: vi.fn().mockReturnValue(mockChain),
  })),
}))

vi.mock('@/lib/messaging/triggers', () => ({
  notifyGatheringReminder: vi.fn().mockResolvedValue(undefined),
  notifyVisitorSLA: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/messaging/dispatcher', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/messaging/templates', () => ({
  TEMPLATES: {
    event_reminder: { titleEn: 'Reminder', titleAr: 'تذكير', bodyEn: '{eventName} at {time}', bodyAr: '{eventName} الساعة {time}' },
  },
  interpolate: vi.fn((template: string) => template),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

const SECRET = 'cron-test-secret-xyz'

const makeReq = (path: string, auth?: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
  })

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Cron Routes — Auth Guard', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET
    vi.clearAllMocks()
    // Reset chain mocks
    for (const m of methods) mockChain[m].mockReturnValue(mockChain)
    mockChain.single.mockResolvedValue({ data: null, error: null })
    for (const m of ['order', 'range', 'limit']) {
      mockChain[m].mockImplementation(() => {
        const p = Promise.resolve({ data: [], error: null, count: 0 })
        return Object.assign(p, mockChain)
      })
    }
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  describe('/api/cron/gathering-reminders', () => {
    it('returns 401 without auth header', async () => {
      const { GET } = await import('@/app/api/cron/gathering-reminders/route')
      const res = await GET(makeReq('/api/cron/gathering-reminders'))
      expect(res.status).toBe(401)
    })

    it('returns 401 with wrong secret', async () => {
      const { GET } = await import('@/app/api/cron/gathering-reminders/route')
      const res = await GET(makeReq('/api/cron/gathering-reminders', 'wrong'))
      expect(res.status).toBe(401)
    })

    it('returns 200 with correct secret', async () => {
      const { GET } = await import('@/app/api/cron/gathering-reminders/route')
      const res = await GET(makeReq('/api/cron/gathering-reminders', SECRET))
      expect(res.status).toBe(200)
    })

    it('is idempotent — running twice succeeds', async () => {
      const { GET } = await import('@/app/api/cron/gathering-reminders/route')
      const res1 = await GET(makeReq('/api/cron/gathering-reminders', SECRET))
      const res2 = await GET(makeReq('/api/cron/gathering-reminders', SECRET))
      expect(res1.status).toBe(200)
      expect(res2.status).toBe(200)
    })
  })

  describe('/api/cron/event-reminders', () => {
    it('returns 401 without auth header', async () => {
      const { GET } = await import('@/app/api/cron/event-reminders/route')
      const res = await GET(makeReq('/api/cron/event-reminders'))
      expect(res.status).toBe(401)
    })

    it('returns 401 with wrong secret', async () => {
      const { GET } = await import('@/app/api/cron/event-reminders/route')
      const res = await GET(makeReq('/api/cron/event-reminders', 'wrong'))
      expect(res.status).toBe(401)
    })

    it('returns 200 with correct secret', async () => {
      const { GET } = await import('@/app/api/cron/event-reminders/route')
      const res = await GET(makeReq('/api/cron/event-reminders', SECRET))
      expect(res.status).toBe(200)
    })
  })

  describe('/api/cron/visitor-sla', () => {
    it('returns 401 without auth header', async () => {
      const { GET } = await import('@/app/api/cron/visitor-sla/route')
      const res = await GET(makeReq('/api/cron/visitor-sla'))
      expect(res.status).toBe(401)
    })

    it('returns 401 with wrong secret', async () => {
      const { GET } = await import('@/app/api/cron/visitor-sla/route')
      const res = await GET(makeReq('/api/cron/visitor-sla', 'wrong'))
      expect(res.status).toBe(401)
    })

    it('returns 200 with correct secret', async () => {
      const { GET } = await import('@/app/api/cron/visitor-sla/route')
      const res = await GET(makeReq('/api/cron/visitor-sla', SECRET))
      expect(res.status).toBe(200)
    })
  })

  describe('/api/cron/notification-cleanup', () => {
    it('returns 401 without auth header', async () => {
      const { GET } = await import('@/app/api/cron/notification-cleanup/route')
      const res = await GET(makeReq('/api/cron/notification-cleanup'))
      expect(res.status).toBe(401)
    })

    it('returns 401 with wrong secret', async () => {
      const { GET } = await import('@/app/api/cron/notification-cleanup/route')
      const res = await GET(makeReq('/api/cron/notification-cleanup', 'wrong'))
      expect(res.status).toBe(401)
    })

    it('returns 200 with correct secret and reports deleted count', async () => {
      const { GET } = await import('@/app/api/cron/notification-cleanup/route')
      const res = await GET(makeReq('/api/cron/notification-cleanup', SECRET))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('deleted')
      expect(body).toHaveProperty('retention_days', 90)
    })
  })
})
