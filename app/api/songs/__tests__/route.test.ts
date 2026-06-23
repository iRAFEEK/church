import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const routeCode = readFileSync('app/api/songs/[id]/route.ts', 'utf-8')
const displayRouteCode = readFileSync('app/api/songs/[id]/display/route.ts', 'utf-8')

// Songs are a shared hymnal: global songs (church_id IS NULL) are editable by
// any leader; scoped songs (church_id = a church) are private to that church.
// Write authorization is enforced by RLS (see migration 073), NOT by an
// app-level church_id filter — so these tests assert the auth model that the
// route is actually responsible for: apiHandler wrapping, permission gating,
// Zod validation, no error leakage, and no select('*').

describe('Songs [id] route — authorization model', () => {
  it('should use apiHandler instead of manual auth', () => {
    expect(routeCode).toContain('apiHandler')
    expect(routeCode).not.toContain('supabase.auth.getUser()')
  })

  it('GET is globally readable (no church_id filter — songs are shared)', () => {
    expect(routeCode).toContain('export const GET = apiHandler')
  })

  it('PATCH requires the can_manage_songs permission', () => {
    // Cross-church write protection is enforced by RLS (migration 073);
    // the route is responsible for gating on the manage-songs permission.
    expect(routeCode).toMatch(/export const PATCH = apiHandler[\s\S]*requirePermissions:\s*\['can_manage_songs'\]/)
  })

  it('DELETE requires the can_manage_songs permission', () => {
    expect(routeCode).toMatch(/export const DELETE = apiHandler[\s\S]*requirePermissions:\s*\['can_manage_songs'\]/)
  })

  it('should use Zod validation on PATCH', () => {
    expect(routeCode).toContain('validate(UpdateSongSchema')
  })

  it('should wrap all handlers with apiHandler (auth required)', () => {
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

describe('Songs [id]/display route — authorization model', () => {
  it('should use apiHandler', () => {
    expect(displayRouteCode).toContain('apiHandler')
    expect(displayRouteCode).not.toContain('supabase.auth.getUser()')
  })

  it('requires the can_manage_songs permission (RLS scopes the write)', () => {
    expect(displayRouteCode).toMatch(/requirePermissions:\s*\['can_manage_songs'\]/)
  })

  it('should validate input with Zod', () => {
    expect(displayRouteCode).toContain('validate(DisplaySettingsSchema')
  })

  it('should not leak error.message', () => {
    expect(displayRouteCode).not.toContain('error.message')
  })
})
