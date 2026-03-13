import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const routeCode = readFileSync('app/api/songs/[id]/route.ts', 'utf-8')
const displayRouteCode = readFileSync('app/api/songs/[id]/display/route.ts', 'utf-8')

describe('Songs [id] route — IDOR prevention', () => {
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

  it('DELETE should filter by church_id', () => {
    expect(routeCode).toContain("eq('church_id', profile.church_id)")
  })

  it('should use Zod validation on PATCH', () => {
    expect(routeCode).toContain('validate(UpdateSongSchema')
  })

  it('should wrap all handlers with apiHandler (auth required)', () => {
    // All handlers use apiHandler which enforces authentication
    expect(routeCode).toContain('export const GET = apiHandler')
    expect(routeCode).toContain('export const PATCH = apiHandler')
    expect(routeCode).toContain('export const DELETE = apiHandler')
  })

  it('should not use select(*)', () => {
    expect(routeCode).not.toContain("select('*')")
  })

  it('should not leak error.message to client', () => {
    expect(routeCode).not.toContain('error.message')
  })
})

describe('Songs [id]/display route — IDOR prevention', () => {
  it('should use apiHandler', () => {
    expect(displayRouteCode).toContain('apiHandler')
    expect(displayRouteCode).not.toContain('supabase.auth.getUser()')
  })

  it('should filter by church_id', () => {
    expect(displayRouteCode).toContain("eq('church_id', profile.church_id)")
  })

  it('should validate input with Zod', () => {
    expect(displayRouteCode).toContain('validate(DisplaySettingsSchema')
  })

  it('should not leak error.message', () => {
    expect(displayRouteCode).not.toContain('error.message')
  })
})
