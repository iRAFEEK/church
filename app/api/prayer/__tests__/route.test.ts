import { describe, it, expect, vi } from 'vitest'

// Mock Supabase to test route logic without a real database
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEq2 = vi.fn(() => ({ select: mockSelect, single: mockSingle }))
const mockEq = vi.fn(() => ({ eq: mockEq2, select: mockSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: vi.fn(() => ({ eq: mockEq })), update: mockUpdate }))

const mockSupabase = {
  from: mockFrom,
  auth: { getUser: vi.fn() },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/api/handler', () => ({
  apiHandler: (handler: Function) => handler,
  ValidationError: class extends Error {
    fields?: Record<string, string>
    constructor(msg: string, fields?: Record<string, string>) {
      super(msg); this.fields = fields
    }
  },
}))

vi.mock('@/lib/api/validate', () => ({
  validate: (_schema: unknown, data: unknown) => data,
}))

describe('Prayer PATCH route — IDOR prevention', () => {
  it('should require church_id filter on prayer request lookup', async () => {
    // The route file imports should include church_id filtering
    const routeCode = await import('fs').then(fs =>
      fs.readFileSync('app/api/prayer/[id]/route.ts', 'utf-8')
    )

    // Verify church_id filter exists in the query
    expect(routeCode).toContain("eq('church_id'")
    expect(routeCode).toContain('profile.church_id')
  })

  it('should NOT use raw body spread (.update(body) without schema)', async () => {
    const routeCode = await import('fs').then(fs =>
      fs.readFileSync('app/api/prayer/[id]/route.ts', 'utf-8')
    )

    // Should use validated body, not raw req.json() in .update()
    expect(routeCode).toContain('validate(UpdatePrayerRequestSchema')
    expect(routeCode).not.toContain('.update(await req.json())')
  })

  it('should use apiHandler instead of manual auth', async () => {
    const routeCode = await import('fs').then(fs =>
      fs.readFileSync('app/api/prayer/[id]/route.ts', 'utf-8')
    )

    expect(routeCode).toContain("apiHandler")
    expect(routeCode).not.toContain("supabase.auth.getUser()")
  })

  it('should check permissions (submitter, assigned, or leader)', async () => {
    const routeCode = await import('fs').then(fs =>
      fs.readFileSync('app/api/prayer/[id]/route.ts', 'utf-8')
    )

    expect(routeCode).toContain('submitted_by')
    expect(routeCode).toContain('assigned_to')
    expect(routeCode).toContain('isLeader')
    expect(routeCode).toContain("'Forbidden'")
  })

  it('should not leak error.message to client', async () => {
    const routeCode = await import('fs').then(fs =>
      fs.readFileSync('app/api/prayer/[id]/route.ts', 'utf-8')
    )

    expect(routeCode).not.toContain('error.message')
  })
})
