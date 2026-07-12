import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── GET /api/songs — search behavior ────────────────────────────────────────
// The GET handler intentionally skips apiHandler (shared read-only resource;
// auth = middleware + RLS), so these tests mock @/lib/supabase/server directly
// and execute the handler, asserting: query sanitization, church resolution
// for the RPC, the ilike fallback when the RPC errors (never 500 the search
// box), and the RPC row mapping (<mark> stripping + hasMore from total_count).
// Style mirrors app/api/churches/__tests__/*.route.test.ts (chainable mock).

// ── Supabase chainable mock ─────────────────────────────────────────────────
const chainMethods = ['select', 'eq', 'order', 'range', 'or', 'limit', 'in']
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
for (const m of chainMethods) mockChain[m] = vi.fn(() => mockChain)
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })

// The fallback/browse builder is awaited directly (`await query`) — make the
// chain thenable so `await mockChain` resolves to the configurable list result.
let listResult: { data: unknown; error: unknown } = { data: [], error: null }
;(mockChain as Record<string, unknown>).then = (
  onFulfilled: (v: unknown) => unknown,
  onRejected?: (e: unknown) => unknown
) => Promise.resolve(listResult).then(onFulfilled, onRejected)

const mockFrom = vi.fn(() => mockChain)
const mockGetSession = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getSession: mockGetSession, getUser: vi.fn() },
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

// Satisfy the module graph pulled in by the POST handler's apiHandler import.
vi.mock('@/lib/auth', () => ({ resolveApiPermissions: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
  checkRateLimitAsync: vi.fn().mockResolvedValue(null),
}))
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: unknown) => fn),
}))

import { GET } from '@/app/api/songs/route'

const makeReq = (params: Record<string, string>) =>
  new NextRequest(`http://localhost/api/songs?${new URLSearchParams(params).toString()}`)

type RpcRow = {
  id: string
  title: string
  title_ar: string | null
  artist: string | null
  artist_ar: string | null
  tags: string[] | null
  is_active: boolean
  snippet: string | null
  total_count: number
}

const rpcRow = (over: Partial<RpcRow> = {}): RpcRow => ({
  id: 'song-1',
  title: 'Amazing Grace',
  title_ar: 'نعمة عجيبة',
  artist: 'John Newton',
  artist_ar: null,
  tags: null,
  is_active: true,
  snippet: null,
  total_count: 1,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
  mockChain.single.mockResolvedValue({ data: null, error: null })
  listResult = { data: [], error: null }
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockRpc.mockResolvedValue({ data: [], error: null })
})

describe('GET /api/songs — query sanitization', () => {
  it('strips punctuation and collapses whitespace before the query reaches the RPC', async () => {
    const res = await GET(makeReq({ q: 'amazing, (grace) 100%' }))
    expect(res.status).toBe(200)

    // Commas/parens/% removed (they break both to_tsquery and PostgREST or-filters),
    // runs of whitespace collapsed, trimmed.
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith(
      'search_songs_with_snippets',
      expect.objectContaining({ p_query: 'amazing grace 100' })
    )
  })

  it('keeps Arabic letters intact (Unicode-aware sanitization)', async () => {
    await GET(makeReq({ q: 'نعمة، (عجيبة)!', locale: 'ar' }))
    expect(mockRpc).toHaveBeenCalledWith(
      'search_songs_with_snippets',
      expect.objectContaining({ p_query: 'نعمة عجيبة', p_locale: 'ar' })
    )
  })

  it('a punctuation-only query sanitizes to empty and skips the RPC entirely (browse path)', async () => {
    listResult = { data: [], error: null }
    const res = await GET(makeReq({ q: '%,()!!' }))
    expect(res.status).toBe(200)
    expect(mockRpc).not.toHaveBeenCalled()
    // Browse path hits the songs table directly.
    expect(mockFrom).toHaveBeenCalledWith('songs')
  })
})

describe('GET /api/songs — church resolution for the RPC', () => {
  it("passes the session profile's church_id as p_church_id (not null)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    mockChain.single.mockResolvedValueOnce({ data: { church_id: 'church-1' }, error: null })

    const res = await GET(makeReq({ q: 'grace' }))
    expect(res.status).toBe(200)

    // The profile lookup is scoped to the session user.
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'user-1')

    expect(mockRpc).toHaveBeenCalledWith(
      'search_songs_with_snippets',
      expect.objectContaining({ p_church_id: 'church-1' })
    )
    const args = mockRpc.mock.calls[0][1] as { p_church_id: string | null }
    expect(args.p_church_id).not.toBeNull()
  })

  it('passes p_church_id = null when there is no session (global hymnal only)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    await GET(makeReq({ q: 'grace' }))
    expect(mockRpc).toHaveBeenCalledWith(
      'search_songs_with_snippets',
      expect.objectContaining({ p_church_id: null })
    )
    // No profile lookup without a session.
    expect(mockFrom).not.toHaveBeenCalledWith('profiles')
  })
})

describe('GET /api/songs — RPC failure falls back to ilike (never 500 the search box)', () => {
  it('returns 200 via the ilike query builder when the RPC errors', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } })
    listResult = {
      data: [
        { id: 's1', title: 'Amazing Grace', title_ar: null, artist: null, artist_ar: null, tags: null, is_active: true },
      ],
      error: null,
    }

    const res = await GET(makeReq({ q: 'grace' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe('s1')

    // The fallback used the .or(...) ilike chain over title/artist columns.
    expect(mockChain.or).toHaveBeenCalledTimes(1)
    expect(mockChain.or).toHaveBeenCalledWith(
      'title.ilike.%grace%,title_ar.ilike.%grace%,artist.ilike.%grace%,artist_ar.ilike.%grace%'
    )
    // Standard fallback shape: active songs, paginated.
    expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
    expect(mockChain.range).toHaveBeenCalledWith(0, 49)
  })

  it('builds one .or() per word on multi-word fallback queries', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    listResult = { data: [], error: null }

    const res = await GET(makeReq({ q: 'amazing grace' }))
    expect(res.status).toBe(200)
    expect(mockChain.or).toHaveBeenCalledTimes(2)
    expect(mockChain.or).toHaveBeenNthCalledWith(
      1,
      'title.ilike.%amazing%,title_ar.ilike.%amazing%,artist.ilike.%amazing%,artist_ar.ilike.%amazing%'
    )
  })

  it('returns 500 with a generic error only when the fallback itself also fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    listResult = { data: null, error: { message: 'db down' } }

    const res = await GET(makeReq({ q: 'grace' }))
    expect(res.status).toBe(500)
    const json = await res.json()
    // Internal details are never leaked to the client.
    expect(json.error).toBe('Internal server error')
    expect(JSON.stringify(json)).not.toContain('db down')
  })
})

describe('GET /api/songs — RPC success row mapping', () => {
  it('strips <mark> tags from snippets and defaults null tags to []', async () => {
    mockRpc.mockResolvedValue({
      data: [
        rpcRow({ id: 's1', snippet: 'saved a <mark>wretch</mark> like <mark>me</mark>', tags: null, total_count: 1 }),
      ],
      error: null,
    })

    const res = await GET(makeReq({ q: 'wretch' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].snippet).toBe('saved a wretch like me')
    expect(json.data[0].snippet).not.toContain('<mark>')
    expect(json.data[0].tags).toEqual([])
    // total_count is an internal RPC column — not exposed on items.
    expect(json.data[0]).not.toHaveProperty('total_count')
  })

  it('computes hasMore=true from total_count when more pages exist (120 rows, page 1, pageSize 50)', async () => {
    mockRpc.mockResolvedValue({ data: [rpcRow({ total_count: 120 })], error: null })

    const res = await GET(makeReq({ q: 'grace', page: '1', pageSize: '50' }))
    const json = await res.json()
    expect(json.hasMore).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith(
      'search_songs_with_snippets',
      expect.objectContaining({ p_page: 1, p_page_size: 50 })
    )
  })

  it('computes hasMore=false on the last page (120 rows, page 3, pageSize 50)', async () => {
    mockRpc.mockResolvedValue({ data: [rpcRow({ total_count: 120 })], error: null })

    const res = await GET(makeReq({ q: 'grace', page: '3', pageSize: '50' }))
    const json = await res.json()
    expect(json.hasMore).toBe(false)
  })

  it('returns empty data + hasMore=false when the RPC finds nothing', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = await GET(makeReq({ q: 'zzzz' }))
    const json = await res.json()
    expect(json.data).toEqual([])
    expect(json.hasMore).toBe(false)
  })
})
