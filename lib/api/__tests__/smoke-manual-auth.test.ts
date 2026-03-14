import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Smoke tests: routes using MANUAL auth (getUser() directly, not apiHandler)
 * must return 401 or redirect to /login when unauthenticated — never 500.
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
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })),
  createAdminClient: vi.fn(async () => ({
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

vi.mock('react', () => ({
  cache: (fn: Function) => fn,
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

// Mock additional dependencies used by these routes
vi.mock('@/lib/auth', () => ({
  getCurrentUserWithRole: vi.fn().mockRejectedValue(new Error('REDIRECT:/login')),
  resolveApiPermissions: vi.fn().mockResolvedValue(null),
  requireRole: vi.fn().mockRejectedValue(new Error('REDIRECT:/login')),
  requirePermission: vi.fn().mockRejectedValue(new Error('REDIRECT:/login')),
}))

vi.mock('@/lib/messaging/triggers', () => ({
  notifyWelcomeVisitor: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/messaging/dispatcher', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/messaging/providers/push', () => ({
  pushProvider: { send: vi.fn().mockResolvedValue({ success: true }) },
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitPublic: vi.fn().mockReturnValue(null),
  rateLimitMutation: vi.fn().mockReturnValue(null),
}))

vi.mock('@/lib/bible/queries', () => ({
  getBooks: vi.fn().mockResolvedValue([]),
  getChapters: vi.fn().mockResolvedValue([]),
  getAllChaptersMap: vi.fn().mockResolvedValue({}),
  getChapterContent: vi.fn().mockResolvedValue(null),
  getChapterVerses: vi.fn().mockResolvedValue([]),
  searchBible: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/utils/normalize', () => ({
  normalizeSearch: vi.fn((s: string) => s),
}))

vi.mock('@/lib/utils/sanitize', () => ({
  sanitizeLikePattern: vi.fn((s: string) => s),
}))

const FAKE_ID = '00000000-0000-0000-0000-000000000001'

const makeReq = (path: string, method = 'GET') =>
  new NextRequest(`http://localhost${path}`, {
    method,
    ...(method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE'
      ? { body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } }
      : {}),
  })

const MANUAL_AUTH_ROUTES: Array<{ method: string; path: string; module: string; params?: Record<string, string> }> = [
  // Events
  { method: 'GET', path: '/api/events', module: '@/app/api/events/route' },
  { method: 'POST', path: '/api/events', module: '@/app/api/events/route' },

  // Events [id]
  { method: 'GET', path: `/api/events/${FAKE_ID}`, module: '@/app/api/events/[id]/route' },
  { method: 'PATCH', path: `/api/events/${FAKE_ID}`, module: '@/app/api/events/[id]/route' },
  { method: 'DELETE', path: `/api/events/${FAKE_ID}`, module: '@/app/api/events/[id]/route' },

  // Profiles
  { method: 'GET', path: '/api/profiles', module: '@/app/api/profiles/route' },

  // Profiles [id]
  { method: 'GET', path: `/api/profiles/${FAKE_ID}`, module: '@/app/api/profiles/[id]/route' },
  { method: 'PATCH', path: `/api/profiles/${FAKE_ID}`, module: '@/app/api/profiles/[id]/route' },

  // Profiles at-risk
  { method: 'GET', path: '/api/profiles/at-risk', module: '@/app/api/profiles/at-risk/route' },

  // Visitors (authenticated GET only — POST is public)
  { method: 'GET', path: '/api/visitors', module: '@/app/api/visitors/route' },

  // Bible bookmarks
  { method: 'GET', path: '/api/bible/bookmarks', module: '@/app/api/bible/bookmarks/route' },
  { method: 'POST', path: '/api/bible/bookmarks', module: '@/app/api/bible/bookmarks/route' },

  // Push test
  { method: 'GET', path: '/api/push/test', module: '@/app/api/push/test/route' },

  // Serving slots
  { method: 'GET', path: '/api/serving/slots', module: '@/app/api/serving/slots/route' },
  { method: 'POST', path: '/api/serving/slots', module: '@/app/api/serving/slots/route' },

  // Templates
  { method: 'GET', path: '/api/templates', module: '@/app/api/templates/route' },
  { method: 'POST', path: '/api/templates', module: '@/app/api/templates/route' },

  // Church prayers
  { method: 'GET', path: '/api/church-prayers', module: '@/app/api/church-prayers/route' },
  { method: 'POST', path: '/api/church-prayers', module: '@/app/api/church-prayers/route' },

  // Outreach
  { method: 'GET', path: '/api/outreach', module: '@/app/api/outreach/route' },

  // Ministries
  { method: 'GET', path: '/api/ministries', module: '@/app/api/ministries/route' },
  { method: 'POST', path: '/api/ministries', module: '@/app/api/ministries/route' },

  // Events [id] sub-routes
  { method: 'GET', path: `/api/events/${FAKE_ID}/segments`, module: '@/app/api/events/[id]/segments/route', params: { id: FAKE_ID } },
  { method: 'GET', path: `/api/events/${FAKE_ID}/registrations`, module: '@/app/api/events/[id]/registrations/route', params: { id: FAKE_ID } },
  { method: 'POST', path: `/api/events/${FAKE_ID}/register`, module: '@/app/api/events/[id]/register/route', params: { id: FAKE_ID } },
  { method: 'GET', path: `/api/events/${FAKE_ID}/service-needs`, module: '@/app/api/events/[id]/service-needs/route', params: { id: FAKE_ID } },
  { method: 'PUT', path: `/api/events/${FAKE_ID}/service-needs`, module: '@/app/api/events/[id]/service-needs/route', params: { id: FAKE_ID } },
  { method: 'GET', path: `/api/events/${FAKE_ID}/ministry-summary`, module: '@/app/api/events/[id]/ministry-summary/route', params: { id: FAKE_ID } },

  // Events from-template
  { method: 'POST', path: '/api/events/from-template', module: '@/app/api/events/from-template/route' },

  // Events service-needs assignments (nested [id]/[needId])
  { method: 'GET', path: `/api/events/${FAKE_ID}/service-needs/${FAKE_ID}/assignments`, module: '@/app/api/events/[id]/service-needs/[needId]/assignments/route', params: { id: FAKE_ID, needId: FAKE_ID } },
  { method: 'POST', path: `/api/events/${FAKE_ID}/service-needs/${FAKE_ID}/assignments`, module: '@/app/api/events/[id]/service-needs/[needId]/assignments/route', params: { id: FAKE_ID, needId: FAKE_ID } },
  { method: 'DELETE', path: `/api/events/${FAKE_ID}/service-needs/${FAKE_ID}/assignments`, module: '@/app/api/events/[id]/service-needs/[needId]/assignments/route', params: { id: FAKE_ID, needId: FAKE_ID } },

  // Events service-needs assignments [assignmentId]
  { method: 'PATCH', path: `/api/events/${FAKE_ID}/service-needs/${FAKE_ID}/assignments/${FAKE_ID}`, module: '@/app/api/events/[id]/service-needs/[needId]/assignments/[assignmentId]/route', params: { id: FAKE_ID, needId: FAKE_ID, assignmentId: FAKE_ID } },

  // Outreach visits
  { method: 'GET', path: '/api/outreach/visits', module: '@/app/api/outreach/visits/route' },
  { method: 'POST', path: '/api/outreach/visits', module: '@/app/api/outreach/visits/route' },

  // Outreach visits [id]
  { method: 'PATCH', path: `/api/outreach/visits/${FAKE_ID}`, module: '@/app/api/outreach/visits/[id]/route', params: { id: FAKE_ID } },
  { method: 'DELETE', path: `/api/outreach/visits/${FAKE_ID}`, module: '@/app/api/outreach/visits/[id]/route', params: { id: FAKE_ID } },

  // Push subscribe/unsubscribe
  { method: 'POST', path: '/api/push/subscribe', module: '@/app/api/push/subscribe/route' },
  { method: 'DELETE', path: '/api/push/unsubscribe', module: '@/app/api/push/unsubscribe/route' },

  // Churches
  { method: 'GET', path: '/api/churches/my-churches', module: '@/app/api/churches/my-churches/route' },
  { method: 'POST', path: '/api/churches/join', module: '@/app/api/churches/join/route' },
  { method: 'POST', path: '/api/churches/switch', module: '@/app/api/churches/switch/route' },

  // Bible highlights (list + create still use manual auth)
  { method: 'GET', path: '/api/bible/highlights', module: '@/app/api/bible/highlights/route' },
  { method: 'POST', path: '/api/bible/highlights', module: '@/app/api/bible/highlights/route' },

  // Bible [bibleId] data routes
  { method: 'GET', path: `/api/bible/${FAKE_ID}/books`, module: '@/app/api/bible/[bibleId]/books/route', params: { bibleId: FAKE_ID } },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/search?query=test`, module: '@/app/api/bible/[bibleId]/search/route', params: { bibleId: FAKE_ID } },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/chapters-map`, module: '@/app/api/bible/[bibleId]/chapters-map/route', params: { bibleId: FAKE_ID } },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/chapters/${FAKE_ID}`, module: '@/app/api/bible/[bibleId]/chapters/[chapterId]/route', params: { bibleId: FAKE_ID, chapterId: FAKE_ID } },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/books/${FAKE_ID}/chapters`, module: '@/app/api/bible/[bibleId]/books/[bookId]/chapters/route', params: { bibleId: FAKE_ID, bookId: FAKE_ID } },
  { method: 'GET', path: `/api/bible/${FAKE_ID}/chapters/${FAKE_ID}/verses`, module: '@/app/api/bible/[bibleId]/chapters/[chapterId]/verses/route', params: { bibleId: FAKE_ID, chapterId: FAKE_ID } },
]

describe('Smoke — manual auth routes return 401 or redirect when unauthenticated', () => {
  for (const route of MANUAL_AUTH_ROUTES) {
    it(`${route.method} ${route.path} → 401 or redirect`, async () => {
      const mod = await import(route.module)
      const handler = mod[route.method]
      if (!handler) return

      const req = makeReq(route.path, route.method)

      // Dynamic route handlers receive a second arg with params
      const hasParams = route.params || route.path.includes(FAKE_ID)
      const paramObj = route.params || { id: FAKE_ID }
      const args: [NextRequest, ...unknown[]] = hasParams
        ? [req, { params: Promise.resolve(paramObj) }]
        : [req]

      try {
        const res = await handler(...args)
        // If we get a response, it should be 401 or 403, not 500
        expect([401, 403]).toContain(res.status)
      } catch (err) {
        // If it throws, it should be a redirect to /login (not an unhandled crash)
        expect((err as Error).message).toContain('REDIRECT')
      }
    })
  }
})
