import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/server
// ---------------------------------------------------------------------------

let mockUser: { id: string } | null = null
let mockProfile: { church_id: string; role: string; permissions: Record<string, boolean> } | null = null
let mockTemplates: any[] = []
let mockSingleTemplate: any | null = null
let mockInsertedTemplate: any | null = null
let mockQueryError: any = null

const selectChain = () => ({
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockImplementation(() => ({
    data: mockTemplates,
    error: mockQueryError,
  })),
  single: vi.fn().mockImplementation(() => ({
    data: mockSingleTemplate ?? mockProfile,
    error: mockQueryError,
  })),
})

const insertChain = () => ({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockReturnValue({
      data: mockInsertedTemplate,
      error: mockQueryError,
    }),
  }),
})

const updateChain = () => ({
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockReturnValue({
      data: mockSingleTemplate,
      error: mockQueryError,
    }),
  }),
})

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'profiles') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({ data: mockProfile, error: null }),
        }),
      }),
    }
  }

  // event_templates
  return {
    select: vi.fn().mockReturnValue(selectChain()),
    insert: vi.fn().mockReturnValue(insertChain()),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          // DELETE path (no .select)
          error: mockQueryError,
          // PATCH path (has .select)
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: mockSingleTemplate,
              error: mockQueryError,
            }),
          }),
        }),
      }),
    }),
  }
})

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockImplementation(() => ({
      data: { user: mockUser },
    })),
  },
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock('@/lib/auth', () => ({
  resolveApiPermissions: vi.fn().mockResolvedValue({ can_manage_templates: true }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method: string, body?: any): NextRequest {
  const url = 'http://localhost:3000/api/templates'
  if (body) {
    return new NextRequest(url, {
      method,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new NextRequest(url, { method })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockProfile = null
    mockTemplates = []
    mockSingleTemplate = null
    mockInsertedTemplate = null
    mockQueryError = null
  })

  it('returns 401 when unauthenticated', async () => {
    const { GET } = await import('@/app/api/templates/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('filters templates by church_id from profile', async () => {
    mockUser = { id: 'user-1' }
    mockProfile = { church_id: 'church-abc', role: 'super_admin', permissions: {} }
    mockTemplates = [
      { id: 't1', name: 'Sunday', church_id: 'church-abc', event_template_needs: [{ id: 'n1' }], event_template_segments: [] },
    ]

    const { GET } = await import('@/app/api/templates/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].needs_count).toBe(1)
    expect(json.data[0].segments_count).toBe(0)

    // Verify church_id was passed as a filter
    const fromCalls = mockFrom.mock.calls
    const templateCalls = fromCalls.filter((call: unknown[]) => call[0] === 'event_templates')
    expect(templateCalls.length).toBeGreaterThan(0)
  })
})

describe('POST /api/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockProfile = null
    mockTemplates = []
    mockSingleTemplate = null
    mockInsertedTemplate = null
    mockQueryError = null
  })

  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('@/app/api/templates/route')
    const res = await POST(makeRequest('POST', { name: 'Test' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('sets church_id from authenticated profile', async () => {
    mockUser = { id: 'user-1' }
    mockProfile = { church_id: 'church-xyz', role: 'super_admin', permissions: {} }
    mockInsertedTemplate = { id: 't-new', name: 'New Template', church_id: 'church-xyz' }

    const { POST } = await import('@/app/api/templates/route')
    const res = await POST(makeRequest('POST', { name: 'New Template' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.church_id).toBe('church-xyz')
  })
})

describe('GET /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockProfile = null
    mockTemplates = []
    mockSingleTemplate = null
    mockInsertedTemplate = null
    mockQueryError = null
  })

  it('returns 401 when unauthenticated', async () => {
    const { GET } = await import('@/app/api/templates/[id]/route')
    const req = new NextRequest('http://localhost:3000/api/templates/t1')
    const res = await GET(req, { params: Promise.resolve({ id: 't1' }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('filters by church_id from profile', async () => {
    mockUser = { id: 'user-1' }
    mockProfile = { church_id: 'church-abc', role: 'member', permissions: {} }
    mockSingleTemplate = {
      id: 't1',
      church_id: 'church-abc',
      event_template_needs: [{ id: 'n1' }],
      event_template_segments: [{ id: 's1', sort_order: 0 }],
    }

    const { GET } = await import('@/app/api/templates/[id]/route')
    const req = new NextRequest('http://localhost:3000/api/templates/t1')
    const res = await GET(req, { params: Promise.resolve({ id: 't1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.needs).toHaveLength(1)
    expect(json.data.segments).toHaveLength(1)
  })
})

describe('PATCH /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockProfile = null
    mockSingleTemplate = null
    mockQueryError = null
  })

  it('returns 401 when unauthenticated', async () => {
    const { PATCH } = await import('@/app/api/templates/[id]/route')
    const req = new NextRequest('http://localhost:3000/api/templates/t1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

describe('DELETE /api/templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockProfile = null
    mockSingleTemplate = null
    mockQueryError = null
  })

  it('returns 401 when unauthenticated', async () => {
    const { DELETE } = await import('@/app/api/templates/[id]/route')
    const req = new NextRequest('http://localhost:3000/api/templates/t1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})
