import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase chainable mock ─────────────────────────────────────────────────
const mockChain: Record<string, ReturnType<typeof vi.fn>> = {}
const chainMethods = [
  'select', 'insert', 'upsert', 'update', 'delete',
  'eq', 'neq', 'in', 'order', 'range', 'limit',
]
for (const m of chainMethods) {
  mockChain[m] = vi.fn().mockReturnValue(mockChain)
}
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null })

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue(mockChain),
  })),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockUnauth() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'No user' },
  })
}

function mockAuth(userId = 'user-1', churchId = 'church-1') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
  // First .single() call returns the profile
  mockChain.single.mockResolvedValueOnce({
    data: { church_id: churchId },
    error: null,
  })
}

function mockAuthWithResult(userId = 'user-1', churchId = 'church-1', result: unknown = { id: 'row-1' }) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
  // First .single() returns profile, second returns inserted/upserted row
  mockChain.single
    .mockResolvedValueOnce({ data: { church_id: churchId }, error: null })
    .mockResolvedValueOnce({ data: result, error: null })
}

const makeReq = (url: string, method = 'GET', body?: object) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Import routes (after mocks) ─────────────────────────────────────────────

import { GET as getBookmarks, POST as postBookmarks } from '@/app/api/bible/bookmarks/route'
import { GET as getHighlights, POST as postHighlights } from '@/app/api/bible/highlights/route'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/bible/bookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
    mockChain.single.mockResolvedValue({ data: null, error: null })
    // Default: order() resolves with data array
    mockChain.order.mockImplementation(() =>
      Promise.resolve({ data: [], error: null }),
    )
  })

  it('GET returns 401 when unauthenticated', async () => {
    mockUnauth()
    const res = await getBookmarks(makeReq('/api/bible/bookmarks'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('GET filters by profile_id (user\'s own)', async () => {
    mockAuth('user-42', 'church-7')
    await getBookmarks(makeReq('/api/bible/bookmarks'))

    // Verify eq was called with profile_id = user.id
    expect(mockChain.eq).toHaveBeenCalledWith('profile_id', 'user-42')
    // Verify eq was called with church_id = profile.church_id
    expect(mockChain.eq).toHaveBeenCalledWith('church_id', 'church-7')
  })

  it('POST returns 401 when unauthenticated', async () => {
    mockUnauth()
    const res = await postBookmarks(
      makeReq('/api/bible/bookmarks', 'POST', { bible_id: 'b1', book_id: 'gen', chapter_id: 'gen-1' }),
    )
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('POST sets profile_id from authenticated user', async () => {
    mockAuthWithResult('user-55', 'church-9', { id: 'bm-1' })
    const body = {
      bible_id: 'svd',
      book_id: 'gen',
      chapter_id: 'gen-1',
      verse_id: 'gen-1-1',
      reference_label: 'Genesis 1:1',
    }
    const res = await postBookmarks(makeReq('/api/bible/bookmarks', 'POST', body))
    expect(res.status).toBe(201)

    // Verify insert was called with profile_id from user and church_id from profile
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'user-55',
        church_id: 'church-9',
        bible_id: 'svd',
      }),
    )
  })
})

describe('/api/bible/highlights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const m of chainMethods) mockChain[m].mockReturnValue(mockChain)
    mockChain.single.mockResolvedValue({ data: null, error: null })
    mockChain.order.mockImplementation(() =>
      Promise.resolve({ data: [], error: null }),
    )
  })

  it('GET returns 401 when unauthenticated', async () => {
    mockUnauth()
    const res = await getHighlights(makeReq('/api/bible/highlights'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('GET filters by profile_id', async () => {
    mockAuth('user-99', 'church-3')
    await getHighlights(makeReq('/api/bible/highlights'))

    expect(mockChain.eq).toHaveBeenCalledWith('profile_id', 'user-99')
    expect(mockChain.eq).toHaveBeenCalledWith('church_id', 'church-3')
  })

  it('POST returns 401 when unauthenticated', async () => {
    mockUnauth()
    const res = await postHighlights(
      makeReq('/api/bible/highlights', 'POST', { verse_id: 'v1', color: 'yellow' }),
    )
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('POST sets church_id from profile', async () => {
    mockAuthWithResult('user-77', 'church-12', { id: 'hl-1' })
    const body = {
      bible_id: 'svd',
      book_id: 'gen',
      chapter_id: 'gen-1',
      verse_id: 'gen-1-1',
      reference_label: 'Genesis 1:1',
      color: 'yellow',
    }
    const res = await postHighlights(makeReq('/api/bible/highlights', 'POST', body))
    expect(res.status).toBe(201)

    // Verify upsert was called with church_id from profile and profile_id from user
    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'user-77',
        church_id: 'church-12',
        color: 'yellow',
      }),
      { onConflict: 'profile_id,verse_id,bible_id' },
    )
  })
})
