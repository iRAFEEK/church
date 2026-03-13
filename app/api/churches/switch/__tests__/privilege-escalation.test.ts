import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('P0-1: Multi-church privilege escalation prevention', () => {
  describe('Switch endpoint updates both church_id AND role', () => {
    const content = fs.readFileSync('app/api/churches/switch/route.ts', 'utf-8')

    it('reads role from user_churches for target church', () => {
      expect(content).toContain("from('user_churches')")
      expect(content).toContain("select('role')")
      expect(content).toContain("eq('user_id'")
      expect(content).toContain("eq('church_id'")
    })

    it('updates profiles with both church_id AND role', () => {
      // Must update role alongside church_id — this is the core fix
      expect(content).toContain('role: membership.role')
      expect(content).toContain('church_id,')
    })

    it('rejects switch if user is not a member of target church', () => {
      expect(content).toContain('not a member of this church')
      expect(content).toContain('403')
    })

    it('does NOT just update church_id alone (the old vulnerable pattern)', () => {
      // The old code was: .update({ church_id }) — only church_id, no role
      // The new code must update both
      expect(content).not.toMatch(/\.update\(\{\s*church_id\s*\}\)/)
    })
  })

  describe('apiHandler cross-references user_churches role', () => {
    const content = fs.readFileSync('lib/api/handler.ts', 'utf-8')

    it('queries user_churches for per-church role', () => {
      expect(content).toContain("from('user_churches')")
      expect(content).toContain("select('role')")
    })

    it('uses effectiveRole for permission resolution', () => {
      expect(content).toContain('effectiveRole')
      expect(content).toContain('resolvePermissions')
    })

    it('falls back to profiles.role if user_churches entry missing', () => {
      // Defense in depth — if user_churches row is missing, fall back gracefully
      expect(content).toContain('membership?.role ?? p.role')
    })
  })

  describe('getCurrentUserWithRole cross-references user_churches', () => {
    const content = fs.readFileSync('lib/auth.ts', 'utf-8')

    it('queries user_churches in getCurrentUserWithRole', () => {
      expect(content).toContain("from('user_churches')")
    })

    it('uses effectiveRole for permission resolution', () => {
      expect(content).toContain('effectiveRole')
    })

    it('falls back gracefully if no user_churches entry', () => {
      expect(content).toContain('membership?.role ?? rawProfile.role')
    })
  })

  describe('Register endpoint creates user_churches entry', () => {
    const content = fs.readFileSync('app/api/churches/register/route.ts', 'utf-8')

    it('inserts into user_churches with super_admin role', () => {
      expect(content).toContain("from('user_churches')")
      expect(content).toContain("role: 'super_admin'")
    })
  })

  describe('resolveApiPermissions supports user_churches cross-check', () => {
    const content = fs.readFileSync('lib/auth.ts', 'utf-8')

    it('accepts optional userId parameter for cross-check', () => {
      expect(content).toContain('userId?: string')
    })

    it('queries user_churches when userId is provided', () => {
      // The function should cross-check with user_churches when userId is available
      expect(content).toContain("eq('user_id', userId)")
    })
  })
})
