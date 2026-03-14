import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/messaging/triggers', () => ({
  notifyWelcomeVisitor: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitPublic: vi.fn().mockReturnValue(null),
  checkRateLimit: vi.fn().mockReturnValue(null),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { POST, GET } from '../route'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notifyWelcomeVisitor } from '@/lib/messaging/triggers'
import { makeAuthContext, makeSupabaseChain } from '@/lib/api/__tests__/fixtures/factories'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHURCH_ID = '550e8400-e29b-41d4-a716-446655440000'
const VISITOR_ID = '660e8400-e29b-41d4-a716-446655440000'

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as import('next/dist/server/web/spec-extension/request').RequestInit)
}

function buildAdminSupabase(overrides: {
  insertReturn?: { data: unknown; error: unknown }
  churchLookup?: { data: unknown }
} = {}) {
  const { insertReturn, churchLookup } = overrides

  const defaultInsert = insertReturn ?? {
    data: { id: VISITOR_ID, church_id: CHURCH_ID, first_name: 'John', last_name: 'Doe', status: 'new', created_at: '2026-01-01' },
    error: null,
  }

  const singleFn = vi.fn().mockResolvedValue(defaultInsert)
  const selectFn = vi.fn().mockReturnValue({ single: singleFn })
  const insertFn = vi.fn().mockReturnValue({ select: selectFn })

  // Church lookup chain for when church_id is not provided
  const churchSingle = vi.fn().mockResolvedValue(
    churchLookup ?? { data: { id: CHURCH_ID } },
  )
  const churchLimit = vi.fn().mockReturnValue({ single: churchSingle })
  const churchOrder = vi.fn().mockReturnValue({ limit: churchLimit })
  const churchEq = vi.fn().mockReturnValue({ order: churchOrder })
  const churchSelect = vi.fn().mockReturnValue({ eq: churchEq })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'churches') return { select: churchSelect }
    return { insert: insertFn }
  })

  return { from, insertFn }
}

/**
 * Build a mock Supabase client that satisfies the apiHandler 3-step auth chain
 * plus the visitors query.
 */
function buildAuthSupabase(options: {
  authenticated?: boolean
  role?: 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
  visitorsReturn?: { data: unknown; error: unknown; count?: number }
} = {}) {
  const { authenticated = true, role = 'super_admin' } = options
  const ctx = makeAuthContext(role, CHURCH_ID)

  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: authenticated ? { id: ctx.user.id, email: ctx.user.email } : null,
    },
    error: authenticated ? null : { message: 'not authenticated' },
  })

  const visitorsChain = makeSupabaseChain()

  if (options.visitorsReturn) {
    visitorsChain.range.mockImplementation(() => {
      const p = Promise.resolve(options.visitorsReturn)
      return Object.assign(p, visitorsChain)
    })
    visitorsChain.order.mockImplementation(() => {
      const p = Promise.resolve(options.visitorsReturn)
      return Object.assign(p, visitorsChain)
    })
  }

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      const chain = makeSupabaseChain()
      chain.single.mockResolvedValue({
        data: { id: ctx.user.id, church_id: CHURCH_ID, role, permissions: null },
        error: null,
      })
      return chain
    }
    if (table === 'user_churches') {
      const chain = makeSupabaseChain()
      chain.single.mockResolvedValue({ data: { role }, error: null })
      return chain
    }
    if (table === 'role_permission_defaults') {
      const chain = makeSupabaseChain()
      chain.single.mockResolvedValue({ data: null, error: null })
      return chain
    }
    return visitorsChain
  })

  return { from, auth: { getUser }, _visitorsChain: visitorsChain }
}

// ---------------------------------------------------------------------------
// POST /api/visitors
// ---------------------------------------------------------------------------

describe('POST /api/visitors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does NOT require authentication (public route)', async () => {
    const adminSupa = buildAdminSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(adminSupa as any)

    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John', last_name: 'Doe', church_id: CHURCH_ID }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    // createClient should NOT be called for POST
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns 422 when first_name is missing', async () => {
    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ last_name: 'Doe', church_id: CHURCH_ID }),
    })

    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 422 when last_name is missing', async () => {
    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John', church_id: CHURCH_ID }),
    })

    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('inserts visitor with church_id', async () => {
    const adminSupa = buildAdminSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(adminSupa as any)

    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John', last_name: 'Doe', church_id: CHURCH_ID }),
    })

    await POST(req)

    expect(adminSupa.from).toHaveBeenCalledWith('visitors')
    expect(adminSupa.insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ church_id: CHURCH_ID, first_name: 'John', last_name: 'Doe' }),
    )
  })

  it('calls notifyWelcomeVisitor fire-and-forget', async () => {
    const adminSupa = buildAdminSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(adminSupa as any)

    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John', last_name: 'Doe', church_id: CHURCH_ID }),
    })

    await POST(req)

    expect(notifyWelcomeVisitor).toHaveBeenCalledWith(VISITOR_ID, CHURCH_ID)
  })

  it('returns 201 on success', async () => {
    const adminSupa = buildAdminSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(adminSupa as any)

    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John', last_name: 'Doe', church_id: CHURCH_ID }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.data).toEqual(
      expect.objectContaining({ id: VISITOR_ID, church_id: CHURCH_ID }),
    )
  })
})

// ---------------------------------------------------------------------------
// GET /api/visitors
// ---------------------------------------------------------------------------

describe('GET /api/visitors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const supa = buildAuthSupabase({ authenticated: false })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('filters by church_id from profile', async () => {
    const supa = buildAuthSupabase({
      visitorsReturn: { data: [], error: null, count: 0 },
    })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors')
    await GET(req)

    expect(supa.from).toHaveBeenCalledWith('visitors')
    expect(supa._visitorsChain.eq).toHaveBeenCalledWith('church_id', CHURCH_ID)
  })

  it('supports status filter', async () => {
    const supa = buildAuthSupabase({
      visitorsReturn: { data: [], error: null, count: 0 },
    })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors?status=new')
    await GET(req)

    expect(supa._visitorsChain.eq).toHaveBeenCalledWith('status', 'new')
  })

  it('supports search query (q param)', async () => {
    const supa = buildAuthSupabase({
      visitorsReturn: { data: [], error: null, count: 0 },
    })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors?q=Jane')
    await GET(req)

    expect(supa._visitorsChain.or).toHaveBeenCalledWith(
      'first_name.ilike.%Jane%,last_name.ilike.%Jane%,phone.ilike.%Jane%',
    )
  })

  it('paginates with page/pageSize', async () => {
    const supa = buildAuthSupabase({
      visitorsReturn: { data: [], error: null, count: 0 },
    })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors?page=2&pageSize=10')
    await GET(req)

    // page 2, pageSize 10 => from=10, to=19
    expect(supa._visitorsChain.range).toHaveBeenCalledWith(10, 19)
  })

  it('returns 403 for member role', async () => {
    const supa = buildAuthSupabase({ role: 'member' })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors')
    const res = await GET(req)

    expect(res.status).toBe(403)
  })
})
