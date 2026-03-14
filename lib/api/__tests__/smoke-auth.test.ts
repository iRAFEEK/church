import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Smoke tests: every apiHandler-protected route returns 401 (not 500)
 * for unauthenticated requests. A 500 means an unhandled crash.
 * A 401 means the auth gate is working correctly.
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

const makeReq = (path: string, method = 'GET') =>
  new NextRequest(`http://localhost${path}`, { method })

// All routes using apiHandler — grouped by module
const APIHANDLER_ROUTES: Array<{ method: string; path: string; module: string }> = [
  // Groups
  { method: 'GET', path: '/api/groups', module: '@/app/api/groups/route' },
  { method: 'POST', path: '/api/groups', module: '@/app/api/groups/route' },

  // Gatherings
  { method: 'GET', path: '/api/gatherings', module: '@/app/api/gatherings/route' },
  { method: 'POST', path: '/api/gatherings', module: '@/app/api/gatherings/route' },

  // Finance - Donations
  { method: 'GET', path: '/api/finance/donations', module: '@/app/api/finance/donations/route' },
  { method: 'POST', path: '/api/finance/donations', module: '@/app/api/finance/donations/route' },

  // Finance - Transactions
  { method: 'GET', path: '/api/finance/transactions', module: '@/app/api/finance/transactions/route' },
  { method: 'POST', path: '/api/finance/transactions', module: '@/app/api/finance/transactions/route' },

  // Finance - Expenses
  { method: 'GET', path: '/api/finance/expenses', module: '@/app/api/finance/expenses/route' },
  { method: 'POST', path: '/api/finance/expenses', module: '@/app/api/finance/expenses/route' },

  // Finance - Funds
  { method: 'GET', path: '/api/finance/funds', module: '@/app/api/finance/funds/route' },
  { method: 'POST', path: '/api/finance/funds', module: '@/app/api/finance/funds/route' },

  // Finance - Accounts
  { method: 'GET', path: '/api/finance/accounts', module: '@/app/api/finance/accounts/route' },
  { method: 'POST', path: '/api/finance/accounts', module: '@/app/api/finance/accounts/route' },

  // Finance - Campaigns
  { method: 'GET', path: '/api/finance/campaigns', module: '@/app/api/finance/campaigns/route' },
  { method: 'POST', path: '/api/finance/campaigns', module: '@/app/api/finance/campaigns/route' },

  // Finance - Budgets
  { method: 'GET', path: '/api/finance/budgets', module: '@/app/api/finance/budgets/route' },
  { method: 'POST', path: '/api/finance/budgets', module: '@/app/api/finance/budgets/route' },

  // Finance - Fiscal Years
  { method: 'GET', path: '/api/finance/fiscal-years', module: '@/app/api/finance/fiscal-years/route' },
  { method: 'POST', path: '/api/finance/fiscal-years', module: '@/app/api/finance/fiscal-years/route' },

  // Finance - My Giving
  { method: 'GET', path: '/api/finance/my-giving', module: '@/app/api/finance/my-giving/route' },

  // Announcements
  { method: 'GET', path: '/api/announcements', module: '@/app/api/announcements/route' },
  { method: 'POST', path: '/api/announcements', module: '@/app/api/announcements/route' },

  // Songs
  { method: 'GET', path: '/api/songs', module: '@/app/api/songs/route' },
  { method: 'POST', path: '/api/songs', module: '@/app/api/songs/route' },

  // Notifications
  { method: 'GET', path: '/api/notifications', module: '@/app/api/notifications/route' },

  // Permissions
  { method: 'GET', path: '/api/permissions/role-defaults', module: '@/app/api/permissions/role-defaults/route' },
  { method: 'GET', path: '/api/permissions/audit-log', module: '@/app/api/permissions/audit-log/route' },

  // Serving
  { method: 'GET', path: '/api/serving/areas', module: '@/app/api/serving/areas/route' },

  // Community Needs
  { method: 'GET', path: '/api/community/needs', module: '@/app/api/community/needs/route' },
  { method: 'POST', path: '/api/community/needs', module: '@/app/api/community/needs/route' },

  // Community Needs - nested routes
  { method: 'GET', path: '/api/community/needs/messages', module: '@/app/api/community/needs/messages/route' },

  // Notifications - send, audience, scopes
  { method: 'POST', path: '/api/notifications/send', module: '@/app/api/notifications/send/route' },
  { method: 'POST', path: '/api/notifications/audience', module: '@/app/api/notifications/audience/route' },
  { method: 'GET', path: '/api/notifications/scopes', module: '@/app/api/notifications/scopes/route' },

  // Events (migrated to apiHandler)
  { method: 'GET', path: '/api/events', module: '@/app/api/events/route' },
  { method: 'POST', path: '/api/events', module: '@/app/api/events/route' },
  { method: 'POST', path: '/api/events/from-template', module: '@/app/api/events/from-template/route' },

  // Serving slots (migrated to apiHandler)
  { method: 'GET', path: '/api/serving/slots', module: '@/app/api/serving/slots/route' },
  { method: 'POST', path: '/api/serving/slots', module: '@/app/api/serving/slots/route' },

  // Templates (migrated to apiHandler)
  { method: 'GET', path: '/api/templates', module: '@/app/api/templates/route' },
  { method: 'POST', path: '/api/templates', module: '@/app/api/templates/route' },

  // Church prayers (migrated to apiHandler)
  { method: 'GET', path: '/api/church-prayers', module: '@/app/api/church-prayers/route' },
  { method: 'POST', path: '/api/church-prayers', module: '@/app/api/church-prayers/route' },
  { method: 'GET', path: '/api/church-prayers/members', module: '@/app/api/church-prayers/members/route' },

  // Outreach (migrated to apiHandler)
  { method: 'GET', path: '/api/outreach', module: '@/app/api/outreach/route' },
  { method: 'GET', path: '/api/outreach/visits', module: '@/app/api/outreach/visits/route' },
  { method: 'POST', path: '/api/outreach/visits', module: '@/app/api/outreach/visits/route' },

  // Visitors (GET migrated to apiHandler; POST is public)
  { method: 'GET', path: '/api/visitors', module: '@/app/api/visitors/route' },

  // Profiles (migrated to apiHandler)
  { method: 'GET', path: '/api/profiles', module: '@/app/api/profiles/route' },
  { method: 'GET', path: '/api/profiles/at-risk', module: '@/app/api/profiles/at-risk/route' },

  // Push (migrated to apiHandler)
  { method: 'GET', path: '/api/push/test', module: '@/app/api/push/test/route' },

  // Bible bookmarks + highlights (migrated to apiHandler)
  { method: 'GET', path: '/api/bible/bookmarks', module: '@/app/api/bible/bookmarks/route' },
  { method: 'POST', path: '/api/bible/bookmarks', module: '@/app/api/bible/bookmarks/route' },
  { method: 'GET', path: '/api/bible/highlights', module: '@/app/api/bible/highlights/route' },
  { method: 'POST', path: '/api/bible/highlights', module: '@/app/api/bible/highlights/route' },
]

describe('Smoke — all apiHandler routes return 401, not 500, when unauthenticated', () => {
  for (const route of APIHANDLER_ROUTES) {
    it(`${route.method} ${route.path} → 401`, async () => {
      const mod = await import(route.module)
      const handler = mod[route.method]

      if (!handler) {
        // Some routes don't export all methods — skip
        return
      }

      const res = await handler(makeReq(route.path, route.method))

      expect(res.status, `${route.method} ${route.path} returned ${res.status}, expected 401`).toBe(401)
    })
  }
})
