import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Smoke tests for [id] routes: every apiHandler-protected [id] route
 * returns 401 (not 500) for unauthenticated requests.
 */

// Mock supabase to return no user
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No user' } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
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

vi.mock('@/lib/absence', () => ({
  checkAndFlagAtRisk: vi.fn(),
}))

const FAKE_ID = '00000000-0000-0000-0000-000000000001'

const makeReq = (path: string, method = 'GET', body?: object) => {
  const opts: RequestInit = { method }
  if (body) {
    opts.body = JSON.stringify(body)
    opts.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(`http://localhost${path}`, opts)
}

// All [id] routes using apiHandler
const ID_ROUTES: Array<{ method: string; path: string; module: string; handler?: string }> = [
  // Groups
  { method: 'GET', path: `/api/groups/${FAKE_ID}`, module: '@/app/api/groups/[id]/route' },
  { method: 'PATCH', path: `/api/groups/${FAKE_ID}`, module: '@/app/api/groups/[id]/route' },
  { method: 'DELETE', path: `/api/groups/${FAKE_ID}`, module: '@/app/api/groups/[id]/route' },

  // Gatherings
  { method: 'GET', path: `/api/gatherings/${FAKE_ID}`, module: '@/app/api/gatherings/[id]/route' },
  { method: 'PATCH', path: `/api/gatherings/${FAKE_ID}`, module: '@/app/api/gatherings/[id]/route' },

  // Songs
  { method: 'GET', path: `/api/songs/${FAKE_ID}`, module: '@/app/api/songs/[id]/route' },
  { method: 'PATCH', path: `/api/songs/${FAKE_ID}`, module: '@/app/api/songs/[id]/route' },
  { method: 'DELETE', path: `/api/songs/${FAKE_ID}`, module: '@/app/api/songs/[id]/route' },

  // Notifications
  { method: 'PATCH', path: `/api/notifications/${FAKE_ID}`, module: '@/app/api/notifications/[id]/route' },

  // Finance - Donations [id]
  { method: 'GET', path: `/api/finance/donations/${FAKE_ID}`, module: '@/app/api/finance/donations/[id]/route' },
  { method: 'PATCH', path: `/api/finance/donations/${FAKE_ID}`, module: '@/app/api/finance/donations/[id]/route' },
  { method: 'DELETE', path: `/api/finance/donations/${FAKE_ID}`, module: '@/app/api/finance/donations/[id]/route' },

  // Finance - Transactions [id]
  { method: 'GET', path: `/api/finance/transactions/${FAKE_ID}`, module: '@/app/api/finance/transactions/[id]/route' },
  { method: 'PATCH', path: `/api/finance/transactions/${FAKE_ID}`, module: '@/app/api/finance/transactions/[id]/route' },

  // Finance - Funds [id]
  { method: 'GET', path: `/api/finance/funds/${FAKE_ID}`, module: '@/app/api/finance/funds/[id]/route' },
  { method: 'PATCH', path: `/api/finance/funds/${FAKE_ID}`, module: '@/app/api/finance/funds/[id]/route' },
  { method: 'DELETE', path: `/api/finance/funds/${FAKE_ID}`, module: '@/app/api/finance/funds/[id]/route' },

  // Finance - Budgets [id]
  { method: 'GET', path: `/api/finance/budgets/${FAKE_ID}`, module: '@/app/api/finance/budgets/[id]/route' },
  { method: 'PATCH', path: `/api/finance/budgets/${FAKE_ID}`, module: '@/app/api/finance/budgets/[id]/route' },

  // Finance - Campaigns [id]
  { method: 'GET', path: `/api/finance/campaigns/${FAKE_ID}`, module: '@/app/api/finance/campaigns/[id]/route' },
  { method: 'PATCH', path: `/api/finance/campaigns/${FAKE_ID}`, module: '@/app/api/finance/campaigns/[id]/route' },

  // Finance - Expenses [id] approve/reject
  { method: 'POST', path: `/api/finance/expenses/${FAKE_ID}/approve`, module: '@/app/api/finance/expenses/[id]/approve/route' },
  { method: 'POST', path: `/api/finance/expenses/${FAKE_ID}/reject`, module: '@/app/api/finance/expenses/[id]/reject/route' },

  // Ministries [id]
  { method: 'GET', path: `/api/ministries/${FAKE_ID}`, module: '@/app/api/ministries/[id]/route' },
  { method: 'PATCH', path: `/api/ministries/${FAKE_ID}`, module: '@/app/api/ministries/[id]/route' },
  { method: 'DELETE', path: `/api/ministries/${FAKE_ID}`, module: '@/app/api/ministries/[id]/route' },

  // Permissions - user [id]
  { method: 'GET', path: `/api/permissions/user/${FAKE_ID}`, module: '@/app/api/permissions/user/[id]/route' },
  { method: 'PATCH', path: `/api/permissions/user/${FAKE_ID}`, module: '@/app/api/permissions/user/[id]/route' },

  // Prayer [id]
  { method: 'PATCH', path: `/api/prayer/${FAKE_ID}`, module: '@/app/api/prayer/[id]/route' },

  // Notification read-all
  { method: 'POST', path: '/api/notifications/read-all', module: '@/app/api/notifications/read-all/route' },

  // Songs [id] display
  { method: 'PATCH', path: `/api/songs/${FAKE_ID}/display`, module: '@/app/api/songs/[id]/display/route' },

  // Gatherings [id] attendance
  { method: 'POST', path: `/api/gatherings/${FAKE_ID}/attendance`, module: '@/app/api/gatherings/[id]/attendance/route' },

  // Gatherings [id] prayer
  { method: 'GET', path: `/api/gatherings/${FAKE_ID}/prayer`, module: '@/app/api/gatherings/[id]/prayer/route' },
  { method: 'POST', path: `/api/gatherings/${FAKE_ID}/prayer`, module: '@/app/api/gatherings/[id]/prayer/route' },

  // Groups [id] gatherings
  { method: 'GET', path: `/api/groups/${FAKE_ID}/gatherings`, module: '@/app/api/groups/[id]/gatherings/route' },
  { method: 'POST', path: `/api/groups/${FAKE_ID}/gatherings`, module: '@/app/api/groups/[id]/gatherings/route' },

  // Groups [id] members
  { method: 'POST', path: `/api/groups/${FAKE_ID}/members`, module: '@/app/api/groups/[id]/members/route' },
  { method: 'DELETE', path: `/api/groups/${FAKE_ID}/members`, module: '@/app/api/groups/[id]/members/route' },
]

describe('Smoke — all [id] apiHandler routes return 401, not 500, when unauthenticated', () => {
  for (const route of ID_ROUTES) {
    it(`${route.method} ${route.path} → 401`, async () => {
      const mod = await import(route.module)
      const handler = mod[route.method]

      if (!handler) return // skip if method not exported

      const res = await handler(makeReq(route.path, route.method))
      expect(res.status, `${route.method} ${route.path} returned ${res.status}, expected 401`).toBe(401)
    })
  }
})
