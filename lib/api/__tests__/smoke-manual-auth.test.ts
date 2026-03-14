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

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitPublic: vi.fn().mockReturnValue(null),
  rateLimitMutation: vi.fn().mockReturnValue(null),
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
  // Ministries (still manual auth)
  { method: 'GET', path: '/api/ministries', module: '@/app/api/ministries/route' },
  { method: 'POST', path: '/api/ministries', module: '@/app/api/ministries/route' },

  // Churches (still manual auth)
  { method: 'GET', path: '/api/churches/my-churches', module: '@/app/api/churches/my-churches/route' },
  { method: 'POST', path: '/api/churches/join', module: '@/app/api/churches/join/route' },
  { method: 'POST', path: '/api/churches/switch', module: '@/app/api/churches/switch/route' },
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
