import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const routeCode = readFileSync('app/api/ministries/[id]/route.ts', 'utf-8')

describe('Ministries [id] route — IDOR prevention', () => {
  it('should use apiHandler instead of manual auth', () => {
    expect(routeCode).toContain('apiHandler')
    expect(routeCode).not.toContain('supabase.auth.getUser()')
  })

  it('GET should filter by church_id', () => {
    expect(routeCode).toContain("eq('church_id', profile.church_id)")
  })

  it('PATCH should filter by church_id', () => {
    const churchIdCount = (routeCode.match(/eq\('church_id', profile\.church_id\)/g) || []).length
    expect(churchIdCount).toBeGreaterThanOrEqual(3) // GET + PATCH + DELETE
  })

  it('should use Zod validation on PATCH', () => {
    expect(routeCode).toContain('validate(UpdateMinistrySchema')
  })

  it('PATCH should require admin roles', () => {
    expect(routeCode).toContain('requireRoles')
    expect(routeCode).toContain("'ministry_leader'")
  })

  it('DELETE should require super_admin', () => {
    expect(routeCode).toContain("'super_admin'")
  })

  it('should validate body with Zod before update', () => {
    // body is validated via Zod before being passed to .update()
    expect(routeCode).toContain('validate(UpdateMinistrySchema')
    // Should NOT use raw req.json() directly in update
    expect(routeCode).not.toContain('.update(await req.json())')
  })

  it('should not leak error.message to client', () => {
    expect(routeCode).not.toContain('error.message')
  })
})
