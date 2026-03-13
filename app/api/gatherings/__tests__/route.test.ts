import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const routeCode = readFileSync('app/api/gatherings/[id]/route.ts', 'utf-8')

describe('Gatherings [id] route — IDOR prevention', () => {
  it('should use apiHandler instead of manual auth', () => {
    expect(routeCode).toContain('apiHandler')
    expect(routeCode).not.toContain('supabase.auth.getUser()')
  })

  it('GET should filter by church_id', () => {
    expect(routeCode).toContain("eq('church_id', profile.church_id)")
  })

  it('PATCH should filter by church_id', () => {
    // Both GET and PATCH should have church_id filter
    const churchIdCount = (routeCode.match(/eq\('church_id', profile\.church_id\)/g) || []).length
    expect(churchIdCount).toBeGreaterThanOrEqual(2) // GET + PATCH
  })

  it('should NOT use select(*) on GET', () => {
    // GET should select specific fields, not *
    // The select should list specific columns
    expect(routeCode).toContain("select(`")
    // Should list specific columns rather than just *
    expect(routeCode).toContain('id, group_id')
  })

  it('should use Zod validation on PATCH', () => {
    expect(routeCode).toContain('validate(UpdateGatheringSchema')
  })

  it('PATCH should require leader roles', () => {
    expect(routeCode).toContain('requireRoles')
  })

  it('should not leak error.message to client', () => {
    expect(routeCode).not.toContain('error.message')
  })

  it('should filter private prayers in GET response', () => {
    expect(routeCode).toContain('is_private')
    expect(routeCode).toContain('filter')
  })
})
