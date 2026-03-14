import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Smoke tests: public routes should NOT return 401.
 * These endpoints are intentionally accessible without authentication
 * (visitor form submission, church registration).
 *
 * Auth-gated routes (churches/search, bible/bibles) are tested here
 * to confirm they return 401 for unauthenticated requests.
 */

// Mock supabase to return no user (simulating unauthenticated request)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    }),
  })),
  createAdminClient: vi.fn(async () => ({
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'fake-user-id' } },
          error: null,
        }),
      },
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'fake-church-id' }, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
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

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
  rateLimitSensitive: vi.fn(() => null),
  checkRateLimit: vi.fn(() => null),
}))

vi.mock('@/lib/messaging/triggers', () => ({
  notifyWelcomeVisitor: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/utils/sanitize', () => ({
  sanitizeLikePattern: vi.fn((s: string) => s),
}))

const makeReq = (path: string, method = 'GET', body?: object) => {
  const opts: RequestInit = { method }
  if (body) {
    opts.body = JSON.stringify(body)
    opts.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(`http://localhost${path}`, opts as import('next/dist/server/web/spec-extension/request').RequestInit)
}

const visitorBody = {
  first_name: 'Test',
  last_name: 'Visitor',
  phone: '+201234567890',
  church_id: 'fake-church',
}

const registerBody = {
  email: 'admin@test.com',
  password: 'securepass123',
  churchNameAr: 'كنيسة تجريبية',
  country: 'EG',
  timezone: 'Africa/Cairo',
}

describe('Smoke — public routes do NOT return 401', () => {
  it('POST /api/visitors (public form) does NOT return 401', async () => {
    const { POST } = await import('@/app/api/visitors/route')
    const res = await POST(makeReq('/api/visitors', 'POST', visitorBody))

    expect(res.status).not.toBe(401)
    expect([200, 201, 400, 422, 500]).toContain(res.status)
  })

  it('POST /api/churches/register does NOT return 401', async () => {
    const { POST } = await import('@/app/api/churches/register/route')
    const res = await POST(makeReq('/api/churches/register', 'POST', registerBody))

    expect(res.status).not.toBe(401)
    expect([200, 201, 400, 409, 422, 500]).toContain(res.status)
  })

  it('GET /api/churches/search returns 401 (auth-gated route)', async () => {
    // Note: despite being in a "search" path, this route requires authentication.
    // This test confirms the auth gate is active for unauthenticated requests.
    const { GET } = await import('@/app/api/churches/search/route')
    const res = await GET(makeReq('/api/churches/search?q=test'))

    expect(res.status).toBe(401)
  })

  it('POST /api/visitors with valid body returns 201 or validation error', async () => {
    const { POST } = await import('@/app/api/visitors/route')
    const res = await POST(makeReq('/api/visitors', 'POST', visitorBody))
    const json = await res.json()

    // Should succeed (201 with data) or fail with validation (400) — never 401
    expect(res.status).not.toBe(401)
    if (res.status === 201) {
      expect(json).toHaveProperty('data')
    } else {
      expect(json).toHaveProperty('error')
    }
  })

  it('POST /api/churches/register with valid body returns success or error (not 401)', async () => {
    const { POST } = await import('@/app/api/churches/register/route')
    const res = await POST(makeReq('/api/churches/register', 'POST', registerBody))
    const json = await res.json()

    expect(res.status).not.toBe(401)
    if (res.status === 201) {
      expect(json).toHaveProperty('success', true)
      expect(json).toHaveProperty('churchId')
    } else {
      expect(json).toHaveProperty('error')
    }
  })

  it('GET /api/bible/bibles returns 401 (auth-gated via apiHandler)', async () => {
    // This route uses apiHandler (requireAuth: true by default) + createAdminClient for data.
    // Unauthenticated requests should get 401.
    const { GET } = await import('@/app/api/bible/bibles/route')
    const res = await GET(makeReq('/api/bible/bibles'))

    expect(res.status).toBe(401)
  })
})
