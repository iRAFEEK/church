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

vi.mock('@/lib/bible/queries', () => ({
  getBooks: vi.fn().mockResolvedValue([]),
  getChapters: vi.fn().mockResolvedValue([]),
  getAllChaptersMap: vi.fn().mockResolvedValue({}),
  getChapterContent: vi.fn().mockResolvedValue(null),
  getChapterVerses: vi.fn().mockResolvedValue([]),
  searchBible: vi.fn().mockResolvedValue([]),
  getBibles: vi.fn().mockResolvedValue([]),
}))

const FAKE_ID = '00000000-0000-0000-0000-000000000001'

const makeReq = (path: string, method = 'GET', body?: object) => {
  const opts: RequestInit = { method }
  if (body) {
    opts.body = JSON.stringify(body)
    opts.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(`http://localhost${path}`, opts as import('next/dist/server/web/spec-extension/request').RequestInit)
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

  // Bible bookmarks [id] (migrated to apiHandler)
  { method: 'PATCH', path: `/api/bible/bookmarks/${FAKE_ID}`, module: '@/app/api/bible/bookmarks/[id]/route' },
  { method: 'DELETE', path: `/api/bible/bookmarks/${FAKE_ID}`, module: '@/app/api/bible/bookmarks/[id]/route' },

  // Bible highlights [id] (migrated to apiHandler)
  { method: 'PATCH', path: `/api/bible/highlights/${FAKE_ID}`, module: '@/app/api/bible/highlights/[id]/route' },
  { method: 'DELETE', path: `/api/bible/highlights/${FAKE_ID}`, module: '@/app/api/bible/highlights/[id]/route' },

  // Events [id] (migrated to apiHandler)
  { method: 'GET', path: `/api/events/${FAKE_ID}`, module: '@/app/api/events/[id]/route' },
  { method: 'PATCH', path: `/api/events/${FAKE_ID}`, module: '@/app/api/events/[id]/route' },
  { method: 'DELETE', path: `/api/events/${FAKE_ID}`, module: '@/app/api/events/[id]/route' },

  // Events [id] sub-routes (migrated to apiHandler)
  { method: 'GET', path: `/api/events/${FAKE_ID}/segments`, module: '@/app/api/events/[id]/segments/route' },
  { method: 'PUT', path: `/api/events/${FAKE_ID}/segments`, module: '@/app/api/events/[id]/segments/route' },
  { method: 'GET', path: `/api/events/${FAKE_ID}/registrations`, module: '@/app/api/events/[id]/registrations/route' },
  { method: 'PATCH', path: `/api/events/${FAKE_ID}/registrations`, module: '@/app/api/events/[id]/registrations/route' },
  { method: 'POST', path: `/api/events/${FAKE_ID}/register`, module: '@/app/api/events/[id]/register/route' },
  { method: 'GET', path: `/api/events/${FAKE_ID}/service-needs`, module: '@/app/api/events/[id]/service-needs/route' },
  { method: 'PUT', path: `/api/events/${FAKE_ID}/service-needs`, module: '@/app/api/events/[id]/service-needs/route' },
  { method: 'GET', path: `/api/events/${FAKE_ID}/ministry-summary`, module: '@/app/api/events/[id]/ministry-summary/route' },

  // Serving [id] (migrated to apiHandler)
  { method: 'GET', path: `/api/serving/areas/${FAKE_ID}`, module: '@/app/api/serving/areas/[id]/route' },
  { method: 'PATCH', path: `/api/serving/areas/${FAKE_ID}`, module: '@/app/api/serving/areas/[id]/route' },
  { method: 'DELETE', path: `/api/serving/areas/${FAKE_ID}`, module: '@/app/api/serving/areas/[id]/route' },
  { method: 'GET', path: `/api/serving/slots/${FAKE_ID}`, module: '@/app/api/serving/slots/[id]/route' },
  { method: 'PATCH', path: `/api/serving/slots/${FAKE_ID}`, module: '@/app/api/serving/slots/[id]/route' },
  { method: 'DELETE', path: `/api/serving/slots/${FAKE_ID}`, module: '@/app/api/serving/slots/[id]/route' },
  { method: 'POST', path: `/api/serving/slots/${FAKE_ID}/signup`, module: '@/app/api/serving/slots/[id]/signup/route' },
  { method: 'DELETE', path: `/api/serving/slots/${FAKE_ID}/signup`, module: '@/app/api/serving/slots/[id]/signup/route' },

  // Templates [id] (migrated to apiHandler)
  { method: 'GET', path: `/api/templates/${FAKE_ID}`, module: '@/app/api/templates/[id]/route' },
  { method: 'PATCH', path: `/api/templates/${FAKE_ID}`, module: '@/app/api/templates/[id]/route' },
  { method: 'DELETE', path: `/api/templates/${FAKE_ID}`, module: '@/app/api/templates/[id]/route' },
  { method: 'PUT', path: `/api/templates/${FAKE_ID}/needs`, module: '@/app/api/templates/[id]/needs/route' },
  { method: 'GET', path: `/api/templates/${FAKE_ID}/segments`, module: '@/app/api/templates/[id]/segments/route' },
  { method: 'PUT', path: `/api/templates/${FAKE_ID}/segments`, module: '@/app/api/templates/[id]/segments/route' },

  // Church prayers [id] (migrated to apiHandler)
  { method: 'PATCH', path: `/api/church-prayers/${FAKE_ID}`, module: '@/app/api/church-prayers/[id]/route' },
  { method: 'DELETE', path: `/api/church-prayers/${FAKE_ID}`, module: '@/app/api/church-prayers/[id]/route' },
  { method: 'POST', path: `/api/church-prayers/${FAKE_ID}/assign`, module: '@/app/api/church-prayers/[id]/assign/route' },
  { method: 'DELETE', path: `/api/church-prayers/${FAKE_ID}/assign`, module: '@/app/api/church-prayers/[id]/assign/route' },

  // Outreach visits [id] (migrated to apiHandler)
  { method: 'PATCH', path: `/api/outreach/visits/${FAKE_ID}`, module: '@/app/api/outreach/visits/[id]/route' },
  { method: 'DELETE', path: `/api/outreach/visits/${FAKE_ID}`, module: '@/app/api/outreach/visits/[id]/route' },

  // Visitors [id] (migrated to apiHandler)
  { method: 'GET', path: `/api/visitors/${FAKE_ID}`, module: '@/app/api/visitors/[id]/route' },
  { method: 'PATCH', path: `/api/visitors/${FAKE_ID}`, module: '@/app/api/visitors/[id]/route' },

  // Profiles [id] (migrated to apiHandler)
  { method: 'GET', path: `/api/profiles/${FAKE_ID}`, module: '@/app/api/profiles/[id]/route' },
  { method: 'PATCH', path: `/api/profiles/${FAKE_ID}`, module: '@/app/api/profiles/[id]/route' },
  { method: 'GET', path: `/api/profiles/${FAKE_ID}/attendance`, module: '@/app/api/profiles/[id]/attendance/route' },
  { method: 'GET', path: `/api/profiles/${FAKE_ID}/involvement`, module: '@/app/api/profiles/[id]/involvement/route' },
  { method: 'GET', path: `/api/profiles/${FAKE_ID}/milestones`, module: '@/app/api/profiles/[id]/milestones/route' },
  { method: 'POST', path: `/api/profiles/${FAKE_ID}/milestones`, module: '@/app/api/profiles/[id]/milestones/route' },

  // Push subscribe/unsubscribe (migrated to apiHandler)
  { method: 'POST', path: '/api/push/subscribe', module: '@/app/api/push/subscribe/route' },
  { method: 'DELETE', path: '/api/push/unsubscribe', module: '@/app/api/push/unsubscribe/route' },

  // Bible [bibleId] data routes (migrated to apiHandler)
  { method: 'GET', path: `/api/bible/${FAKE_ID}/books`, module: '@/app/api/bible/[bibleId]/books/route' },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/search`, module: '@/app/api/bible/[bibleId]/search/route' },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/chapters-map`, module: '@/app/api/bible/[bibleId]/chapters-map/route' },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/chapters/${FAKE_ID}`, module: '@/app/api/bible/[bibleId]/chapters/[chapterId]/route' },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/books/${FAKE_ID}/chapters`, module: '@/app/api/bible/[bibleId]/books/[bookId]/chapters/route' },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/chapters/${FAKE_ID}/verses`, module: '@/app/api/bible/[bibleId]/chapters/[chapterId]/verses/route' },

  // Bible bibles list (migrated to apiHandler)
  { method: 'GET', path: '/api/bible/bibles', module: '@/app/api/bible/bibles/route' },
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
