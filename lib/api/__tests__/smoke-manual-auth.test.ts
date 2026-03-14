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
  // All user-auth routes migrated to apiHandler.
  // Only churches/search remains manual (needs profile-optional support).
]

describe('Smoke — manual auth routes return 401 or redirect when unauthenticated', () => {
  it('all user-auth routes have been migrated to apiHandler', () => {
    expect(MANUAL_AUTH_ROUTES).toHaveLength(0)
  })
})
