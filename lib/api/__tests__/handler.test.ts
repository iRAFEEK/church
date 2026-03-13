import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
          eq: vi.fn().mockReturnValue({ single: mockSingle }),
        }),
      }),
    }),
  })),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { apiHandler, ValidationError } from '@/lib/api/handler'

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockAuthenticated(role = 'super_admin', churchId = 'church-123') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  // First .single() call → profiles
  // Second .single() call → user_churches
  // Third .single() call → role_permission_defaults
  mockSingle
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'No user' },
  })
}

const makeReq = (method = 'GET', body?: object) =>
  new NextRequest('http://localhost:3000/api/test', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Tests ───────────────────────────────────────────────────────────────────

describe('apiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockUnauthenticated()

      const handler = apiHandler(async () => NextResponse.json({ ok: true }))
      const res = await handler(makeReq())

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('calls inner handler when user is authenticated', async () => {
      mockAuthenticated()

      const inner = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
      const handler = apiHandler(inner)

      const res = await handler(makeReq())
      expect(res.status).toBe(200)
      expect(inner).toHaveBeenCalledOnce()
    })
  })

  describe('role enforcement', () => {
    it('returns 403 when user role is not in requireRoles', async () => {
      mockAuthenticated('member')

      const handler = apiHandler(
        async () => NextResponse.json({ ok: true }),
        { requireRoles: ['super_admin'] },
      )

      const res = await handler(makeReq())
      expect(res.status).toBe(403)
    })

    it('allows access when user role matches requireRoles', async () => {
      mockAuthenticated('super_admin')

      const handler = apiHandler(
        async () => NextResponse.json({ ok: true }),
        { requireRoles: ['super_admin', 'ministry_leader'] },
      )

      const res = await handler(makeReq())
      expect(res.status).toBe(200)
    })

    it('allows any authenticated user when requireRoles is not set', async () => {
      mockAuthenticated('member')

      const handler = apiHandler(async () => NextResponse.json({ ok: true }))

      const res = await handler(makeReq())
      expect(res.status).toBe(200)
    })
  })

  describe('permission enforcement', () => {
    it('returns 403 when user lacks required permissions', async () => {
      mockAuthenticated('member') // member has almost no permissions

      const handler = apiHandler(
        async () => NextResponse.json({ ok: true }),
        { requirePermissions: ['can_manage_finances'] },
      )

      const res = await handler(makeReq())
      expect(res.status).toBe(403)
    })

    it('allows access when user has required permissions', async () => {
      mockAuthenticated('super_admin') // super_admin has all permissions

      const handler = apiHandler(
        async () => NextResponse.json({ ok: true }),
        { requirePermissions: ['can_manage_finances'] },
      )

      const res = await handler(makeReq())
      expect(res.status).toBe(200)
    })
  })

  describe('context injection', () => {
    it('passes churchId to inner handler', async () => {
      const expectedChurchId = 'church-xyz-999'
      mockAuthenticated('super_admin', expectedChurchId)

      let received: string | undefined
      const handler = apiHandler(async (ctx) => {
        received = ctx.profile.church_id
        return NextResponse.json({ ok: true })
      })

      await handler(makeReq())
      expect(received).toBe(expectedChurchId)
    })

    it('passes profile with correct role to inner handler', async () => {
      mockAuthenticated('ministry_leader')

      let receivedRole: string | undefined
      const handler = apiHandler(async (ctx) => {
        receivedRole = ctx.profile.role
        return NextResponse.json({ ok: true })
      })

      await handler(makeReq())
      expect(receivedRole).toBe('ministry_leader')
    })

    it('passes resolved params from route context', async () => {
      mockAuthenticated()

      let receivedParams: Record<string, string> | undefined
      const handler = apiHandler(async (ctx) => {
        receivedParams = ctx.params
        return NextResponse.json({ ok: true })
      })

      await handler(makeReq(), { params: Promise.resolve({ id: 'test-id-123' }) })
      expect(receivedParams).toEqual({ id: 'test-id-123' })
    })
  })

  describe('error handling', () => {
    it('returns 500 when inner handler throws generic error', async () => {
      mockAuthenticated()

      const handler = apiHandler(async () => {
        throw new Error('Something broke')
      })

      const res = await handler(makeReq())
      expect(res.status).toBe(500)
    })

    it('does NOT leak internal error details in 500 response', async () => {
      mockAuthenticated()

      const handler = apiHandler(async () => {
        throw new Error('postgres://user:secret@host:5432/db connection failed')
      })

      const res = await handler(makeReq())
      const body = await res.json()
      expect(body.error).toBe('Internal server error')
      expect(JSON.stringify(body)).not.toContain('postgres://')
      expect(JSON.stringify(body)).not.toContain('secret')
    })

    it('returns 422 with field details when ValidationError is thrown', async () => {
      mockAuthenticated()

      const handler = apiHandler(async () => {
        throw new ValidationError('Validation failed', { name: 'Required' })
      })

      const res = await handler(makeReq())
      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error).toBe('Validation failed')
      expect(body.fields).toEqual({ name: 'Required' })
    })
  })

  describe('plain object auto-wrapping', () => {
    it('wraps plain object return in NextResponse.json', async () => {
      mockAuthenticated()

      const handler = apiHandler(async () => ({ data: [1, 2, 3] }))
      const res = await handler(makeReq())

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([1, 2, 3])
    })

    it('adds Server-Timing header for plain object responses', async () => {
      mockAuthenticated()

      const handler = apiHandler(async () => ({ ok: true }))
      const res = await handler(makeReq())

      expect(res.headers.get('Server-Timing')).toMatch(/handler;dur=\d+/)
    })
  })
})
