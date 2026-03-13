import { describe, it, expect } from 'vitest'
import {
  resolvePermissions,
  hasPermission,
  hasAnyPermission,
  HARDCODED_ROLE_DEFAULTS,
  ALL_PERMISSIONS,
} from '../permissions'
import type { PermissionKey, PermissionMap } from '@/types'

describe('resolvePermissions', () => {
  describe('super_admin', () => {
    it('always gets all permissions regardless of overrides', () => {
      const result = resolvePermissions('super_admin', null, null)
      for (const key of ALL_PERMISSIONS) {
        expect(result[key]).toBe(true)
      }
    })

    it('ignores church defaults that try to restrict', () => {
      const churchDefaults: PermissionMap = {
        can_view_members: false,
        can_manage_finances: false,
      }
      const result = resolvePermissions('super_admin', churchDefaults, null)
      expect(result.can_view_members).toBe(true)
      expect(result.can_manage_finances).toBe(true)
    })

    it('ignores user overrides', () => {
      const result = resolvePermissions('super_admin', null, { can_view_members: false })
      expect(result.can_view_members).toBe(true)
    })
  })

  describe('member role', () => {
    it('returns hardcoded defaults when no church defaults or user overrides', () => {
      const result = resolvePermissions('member', null, null)
      expect(result).toEqual(HARDCODED_ROLE_DEFAULTS.member)
    })

    it('member can only view own giving by default', () => {
      const result = resolvePermissions('member', null, null)
      expect(result.can_view_own_giving).toBe(true)
      expect(result.can_view_members).toBe(false)
      expect(result.can_manage_members).toBe(false)
      expect(result.can_manage_events).toBe(false)
    })
  })

  describe('church defaults layer', () => {
    it('church defaults override hardcoded defaults', () => {
      const churchDefaults: PermissionMap = {
        can_view_members: true,
      }
      const result = resolvePermissions('member', churchDefaults, null)
      expect(result.can_view_members).toBe(true)
    })

    it('church defaults can revoke hardcoded permissions', () => {
      // group_leader has can_view_visitors: true by default
      const churchDefaults: PermissionMap = {
        can_view_visitors: false,
      }
      const result = resolvePermissions('group_leader', churchDefaults, null)
      expect(result.can_view_visitors).toBe(false)
    })

    it('ignores unknown permission keys in church defaults', () => {
      const churchDefaults = {
        bogus_permission: true,
        can_view_members: true,
      } as PermissionMap
      const result = resolvePermissions('member', churchDefaults, null)
      expect(result.can_view_members).toBe(true)
      expect((result as Record<string, boolean>)['bogus_permission']).toBeUndefined()
    })

    it('ignores non-boolean values in church defaults', () => {
      const churchDefaults = {
        can_view_members: 'yes' as unknown as boolean,
      } as PermissionMap
      const result = resolvePermissions('member', churchDefaults, null)
      // Should remain false because 'yes' is not typeof boolean
      expect(result.can_view_members).toBe(false)
    })
  })

  describe('user overrides layer (additive only)', () => {
    it('user overrides can grant permissions', () => {
      const userOverrides: PermissionMap = {
        can_manage_songs: true,
      }
      const result = resolvePermissions('member', null, userOverrides)
      expect(result.can_manage_songs).toBe(true)
    })

    it('user overrides CANNOT revoke permissions (additive model)', () => {
      // group_leader has can_view_visitors: true
      const userOverrides: PermissionMap = {
        can_view_visitors: false,
      }
      const result = resolvePermissions('group_leader', null, userOverrides)
      // Should remain true because user overrides are additive only
      expect(result.can_view_visitors).toBe(true)
    })

    it('user overrides can add on top of church defaults', () => {
      const churchDefaults: PermissionMap = {
        can_view_members: true,
      }
      const userOverrides: PermissionMap = {
        can_manage_songs: true,
      }
      const result = resolvePermissions('member', churchDefaults, userOverrides)
      expect(result.can_view_members).toBe(true)
      expect(result.can_manage_songs).toBe(true)
    })

    it('user overrides cannot undo church defaults', () => {
      const churchDefaults: PermissionMap = {
        can_view_members: true,
      }
      const userOverrides: PermissionMap = {
        can_view_members: false,
      }
      const result = resolvePermissions('member', churchDefaults, userOverrides)
      // Church default set it to true, user override with false is ignored (additive)
      expect(result.can_view_members).toBe(true)
    })
  })

  describe('three-layer merge', () => {
    it('applies all three layers correctly', () => {
      // Start: group_leader defaults
      // Church: grant can_manage_songs
      // User: grant can_manage_announcements
      const churchDefaults: PermissionMap = { can_manage_songs: true }
      const userOverrides: PermissionMap = { can_manage_announcements: true }

      const result = resolvePermissions('group_leader', churchDefaults, userOverrides)

      // From hardcoded defaults
      expect(result.can_view_visitors).toBe(true)
      expect(result.can_view_reports).toBe(true)
      // From church defaults
      expect(result.can_manage_songs).toBe(true)
      // From user overrides
      expect(result.can_manage_announcements).toBe(true)
      // Still false (no layer granted it)
      expect(result.can_manage_members).toBe(false)
    })
  })

  describe('ministry_leader defaults', () => {
    it('has expected default permissions', () => {
      const result = resolvePermissions('ministry_leader', null, null)
      expect(result.can_manage_events).toBe(true)
      expect(result.can_manage_templates).toBe(true)
      expect(result.can_manage_serving).toBe(true)
      expect(result.can_approve_expenses).toBe(true)
      expect(result.can_submit_expenses).toBe(true)
      expect(result.can_manage_members).toBe(false)
      expect(result.can_manage_finances).toBe(false)
    })
  })
})

describe('hasPermission', () => {
  it('returns true for granted permission', () => {
    const perms = resolvePermissions('super_admin', null, null)
    expect(hasPermission(perms, 'can_view_members')).toBe(true)
  })

  it('returns false for denied permission', () => {
    const perms = resolvePermissions('member', null, null)
    expect(hasPermission(perms, 'can_view_members')).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  it('returns true if any one of the listed permissions is granted', () => {
    const perms = resolvePermissions('member', null, null)
    // member has can_view_own_giving: true
    expect(hasAnyPermission(perms, 'can_view_members', 'can_view_own_giving')).toBe(true)
  })

  it('returns false if none are granted', () => {
    const perms = resolvePermissions('member', null, null)
    expect(hasAnyPermission(perms, 'can_view_members', 'can_manage_finances')).toBe(false)
  })

  it('works with single permission', () => {
    const perms = resolvePermissions('super_admin', null, null)
    expect(hasAnyPermission(perms, 'can_reconcile_bank')).toBe(true)
  })
})
