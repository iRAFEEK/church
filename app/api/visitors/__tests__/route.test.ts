import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/messaging/triggers', () => ({
  notifyWelcomeVisitor: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitPublic: vi.fn().mockReturnValue(null),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

import { POST, GET } from '../route'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notifyWelcomeVisitor } from '@/lib/messaging/triggers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHURCH_ID = 'church-uuid-1'
const VISITOR_ID = 'visitor-uuid-1'

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as import('next/dist/server/web/spec-extension/request').RequestInit)
}

function buildAdminSupabase(overrides: {
  insertReturn?: { data: unknown; error: unknown }
  churchLookup?: { data: unknown }
} = {}) {
  const { insertReturn, churchLookup } = overrides

  const defaultInsert = insertReturn ?? {
    data: { id: VISITOR_ID, church_id: CHURCH_ID, first_name: 'John', last_name: 'Doe' },
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

function buildAuthSupabase(overrides: {
  user?: unknown
  queryReturn?: { data: unknown; error: unknown; count: number }
} = {}) {
  const { user, queryReturn } = overrides

  const defaultQuery = queryReturn ?? {
    data: [{ id: VISITOR_ID, first_name: 'Jane', last_name: 'Doe' }],
    error: null,
    count: 1,
  }

  // The source builds: select().order().range(), then conditionally .eq() / .or()
  // Each method must return a query-like object that supports all chainable methods + is thenable.
  const orFn = vi.fn()
  const eqFn = vi.fn()
  const rangeFn = vi.fn()

  const queryObj: Record<string, unknown> = {}
  queryObj.eq = eqFn
  queryObj.or = orFn
  queryObj.range = rangeFn
  queryObj.order = vi.fn().mockReturnValue(queryObj)
  queryObj.then = (resolve: (v: unknown) => void) => Promise.resolve(defaultQuery).then(resolve)

  eqFn.mockReturnValue(queryObj)
  orFn.mockReturnValue(queryObj)
  rangeFn.mockReturnValue(queryObj)

  const selectFn = vi.fn().mockReturnValue(queryObj)
  const from = vi.fn().mockReturnValue({ select: selectFn })

  const getUser = vi.fn().mockResolvedValue({
    data: { user: user !== undefined ? user : { id: 'user-1' } },
  })

  return { from, auth: { getUser }, selectFn, eqFn, orFn, rangeFn }
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

  it('returns 400 when first_name is missing', async () => {
    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ last_name: 'Doe', church_id: CHURCH_ID }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when last_name is missing', async () => {
    const req = makeRequest('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ first_name: 'John', church_id: CHURCH_ID }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
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
    const supa = buildAuthSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('supports status filter', async () => {
    const supa = buildAuthSupabase()
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors?status=new')
    await GET(req)

    expect(supa.eqFn).toHaveBeenCalledWith('status', 'new')
  })

  it('supports search query (q param)', async () => {
    const supa = buildAuthSupabase()
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors?q=Jane')
    await GET(req)

    expect(supa.orFn).toHaveBeenCalledWith(
      'first_name.ilike.%Jane%,last_name.ilike.%Jane%,phone.ilike.%Jane%',
    )
  })

  it('paginates with page/pageSize', async () => {
    const supa = buildAuthSupabase()
    vi.mocked(createClient).mockResolvedValue(supa as any)

    const req = makeRequest('/api/visitors?page=2&pageSize=10')
    await GET(req)

    // page 2, pageSize 10 => from=10, to=19
    expect(supa.rangeFn).toHaveBeenCalledWith(10, 19)
  })
})
