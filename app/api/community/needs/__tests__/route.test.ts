import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Supabase chainable mock ─────────────────────────────────────────────────
const chainMethods = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not',
  'or', 'order', 'range', 'limit', 'throwOnError',
]
const terminalMethods = ['single', 'maybeSingle']

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const m of chainMethods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  for (const m of terminalMethods) {
    chain[m] = vi.fn().mockResolvedValue({ data: null, error: null })
  }
  for (const m of ['order', 'range']) {
    chain[m].mockImplementation(() => {
      const p = Promise.resolve({ data: [], error: null, count: 0 })
      return Object.assign(p, chain)
    })
  }
  return chain
}

let mockChain = createMockChain()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockImplementation(() => mockChain),
  })),
  createAdminClient: vi.fn(async () => ({
    from: vi.fn().mockImplementation(() => mockChain),
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockAuth(role = 'super_admin', churchId = 'church-needs-test') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  // profiles query -> user_churches query -> role_permission_defaults query
  mockChain.single
    .mockResolvedValueOnce({ data: { id: 'user-1', church_id: churchId, role, permissions: null }, error: null })
    .mockResolvedValueOnce({ data: { role }, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
}

function mockUnauth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
}

const makeReq = (method = 'GET', body?: object, query = '') =>
  new NextRequest(`http://localhost/api/community/needs${query}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

const makeIdReq = (id: string, method = 'GET', body?: object) =>
  new NextRequest(`http://localhost/api/community/needs/${id}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })

// ── Source code for static analysis tests ────────────────────────────────────
const listRouteCode = readFileSync(join(process.cwd(), 'app/api/community/needs/route.ts'), 'utf-8')
const idRouteCode = readFileSync(join(process.cwd(), 'app/api/community/needs/[id]/route.ts'), 'utf-8')

// ── Import route handlers (after mocks) ─────────────────────────────────────

import { GET, POST } from '@/app/api/community/needs/route'
import { GET as GET_BY_ID } from '@/app/api/community/needs/[id]/route'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/community/needs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChain = createMockChain()
  })

  // 1. GET /needs returns 401 unauthenticated
  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await GET(makeReq())
      expect(res.status).toBe(401)
    })
  })

  // 2. GET /needs requires can_view_church_needs permission
  describe('GET — permission enforcement', () => {
    it('returns 403 when member role lacks can_view_church_needs', async () => {
      mockAuth('member')
      const res = await GET(makeReq())
      expect(res.status).toBe(403)
    })

    it('returns 200 for super_admin', async () => {
      mockAuth('super_admin')
      const res = await GET(makeReq())
      expect(res.status).toBe(200)
    })
  })

  // 3. GET /needs filters by status
  describe('GET — status filtering', () => {
    it('passes status filter to the query', async () => {
      mockAuth('super_admin')
      await GET(makeReq('GET', undefined, '?status=open'))
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'open')
    })
  })

  // 4. POST /needs returns 401 unauthenticated
  describe('POST — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await POST(makeReq('POST', { title: 'Need chairs', category: 'furniture' }))
      expect(res.status).toBe(401)
    })
  })

  // 5. POST /needs requires can_manage_church_needs permission
  describe('POST — permission enforcement', () => {
    it('returns 403 when member role lacks can_manage_church_needs', async () => {
      mockAuth('member')
      const res = await POST(makeReq('POST', { title: 'Need chairs', category: 'furniture' }))
      expect(res.status).toBe(403)
    })

    it('returns 403 when group_leader role lacks can_manage_church_needs', async () => {
      mockAuth('group_leader')
      const res = await POST(makeReq('POST', { title: 'Need chairs', category: 'furniture' }))
      expect(res.status).toBe(403)
    })
  })

  // 6. POST /needs sets church_id from profile
  describe('POST — church_id from profile', () => {
    it('inserts with church_id from the authenticated profile', async () => {
      const myChurch = 'church-mine-456'
      mockAuth('super_admin', myChurch)

      // After auth chain (3 singles consumed), insert().select().single()
      mockChain.single
        .mockResolvedValueOnce({ data: { id: 'need-1', church_id: myChurch }, error: null })

      let capturedInsert: Record<string, unknown> | undefined
      mockChain.insert.mockImplementation((row: Record<string, unknown>) => {
        capturedInsert = row
        return mockChain
      })

      await POST(makeReq('POST', { title: 'Need chairs', category: 'furniture' }))
      expect(capturedInsert).toBeDefined()
      expect(capturedInsert!.church_id).toBe(myChurch)
    })
  })

  // 7. POST /needs validates request body
  describe('POST — validation', () => {
    it('returns 422 for missing title', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', { category: 'furniture' }))
      expect(res.status).toBe(422)
    })

    it('returns 422 for missing category', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', { title: 'Need chairs' }))
      expect(res.status).toBe(422)
    })

    it('returns 422 for invalid category value', async () => {
      mockAuth('super_admin')
      const res = await POST(makeReq('POST', { title: 'Need chairs', category: 'invalid_cat' }))
      expect(res.status).toBe(422)
    })
  })

  // 13. GET /needs supports pagination
  describe('GET — pagination', () => {
    it('passes page and pageSize to range()', async () => {
      mockAuth('super_admin')
      await GET(makeReq('GET', undefined, '?page=3&pageSize=10'))
      // page 3, pageSize 10 -> from=20, to=29
      expect(mockChain.range).toHaveBeenCalledWith(20, 29)
    })
  })

  // 14. POST /needs sets created_by to user.id
  describe('POST — created_by from user', () => {
    it('inserts with created_by set to authenticated user.id', async () => {
      mockAuth('super_admin')

      // After auth chain (3 singles consumed), insert().select().single()
      mockChain.single
        .mockResolvedValueOnce({ data: { id: 'need-1' }, error: null })

      let capturedInsert: Record<string, unknown> | undefined
      mockChain.insert.mockImplementation((row: Record<string, unknown>) => {
        capturedInsert = row
        return mockChain
      })

      await POST(makeReq('POST', { title: 'Need projector', category: 'electronics' }))
      expect(capturedInsert).toBeDefined()
      expect(capturedInsert!.created_by).toBe('user-1')
    })
  })
})

describe('/api/community/needs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChain = createMockChain()
  })

  // 8. GET /needs/[id] returns 401 unauthenticated
  describe('GET — authentication', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockUnauth()
      const res = await GET_BY_ID(makeIdReq('need-1'), { params: Promise.resolve({ id: 'need-1' }) })
      expect(res.status).toBe(401)
    })
  })

  // 9. PATCH /needs/[id] requires can_manage_church_needs
  describe('PATCH — permission enforcement', () => {
    it('PATCH handler enforces can_manage_church_needs permission', () => {
      // The PATCH export in the [id] route uses apiHandler with requirePermissions
      expect(idRouteCode).toContain('export const PATCH = apiHandler')
      expect(idRouteCode).toContain("requirePermissions: ['can_manage_church_needs']")
    })
  })

  // 10. PATCH /needs/[id] only updates own church's needs (church_id isolation)
  describe('PATCH — church_id isolation', () => {
    it('PATCH verifies church_id ownership before updating', () => {
      // The PATCH handler checks existing.church_id !== profile.church_id
      expect(idRouteCode).toContain('existing.church_id !== profile.church_id')
      // Returns 403 Forbidden if mismatch
      expect(idRouteCode).toContain("{ error: 'Forbidden' }, { status: 403 }")
    })
  })

  // 11. DELETE /needs/[id] requires can_manage_church_needs
  describe('DELETE — permission enforcement', () => {
    it('DELETE handler requires can_manage_church_needs and super_admin role', () => {
      expect(idRouteCode).toContain('export const DELETE = apiHandler')
      expect(idRouteCode).toContain("requirePermissions: ['can_manage_church_needs']")
      expect(idRouteCode).toContain("requireRoles: ['super_admin']")
    })
  })

  // 12. DELETE /needs/[id] only deletes own church's needs
  describe('DELETE — church_id isolation', () => {
    it('DELETE filters by church_id from profile', () => {
      // DELETE uses .eq('church_id', profile.church_id) to scope deletion
      expect(idRouteCode).toContain(".eq('church_id', profile.church_id)")
    })
  })
})
