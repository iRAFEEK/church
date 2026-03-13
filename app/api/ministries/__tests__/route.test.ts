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

  it('should use allowed-list field filtering on PATCH', () => {
    // PATCH uses an explicit allowed-list pattern instead of Zod schema
    expect(routeCode).toContain('const allowed =')
    expect(routeCode).toContain("'name'")
    expect(routeCode).toContain("'name_ar'")
  })

  it('DELETE should require super_admin role', () => {
    expect(routeCode).toContain('requireRoles')
    expect(routeCode).toContain("'super_admin'")
  })

  it('should filter update fields through allowed-list before update', () => {
    // Uses allowed-list pattern to prevent mass assignment
    expect(routeCode).toContain('const allowed =')
    expect(routeCode).toContain('.update(updates)')
    // Should NOT use raw req.json() directly in update
    expect(routeCode).not.toContain('.update(await req.json())')
    expect(routeCode).not.toContain('.update(body)')
  })

  it('should not leak error.message to client', () => {
    expect(routeCode).not.toContain('error.message')
  })
})
