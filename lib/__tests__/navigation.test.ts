import { describe, it, expect } from 'vitest'
import {
  NAV_ITEMS,
  PRIMARY_MOBILE_PATHS,
  getNavForRole,
  getNavForUser,
  getSecondaryNavItems,
  getNavSections,
} from '@/lib/navigation'
import type { PermissionKey, UserRole } from '@/types'
import { ALL_PERMISSIONS } from '@/lib/permissions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePermissions(value: boolean): Record<PermissionKey, boolean> {
  const perms = {} as Record<PermissionKey, boolean>
  for (const key of ALL_PERMISSIONS) {
    perms[key] = value
  }
  return perms
}

const ALL_ROLES: UserRole[] = ['member', 'group_leader', 'ministry_leader', 'super_admin']

// ---------------------------------------------------------------------------
// NAV_ITEMS shape
// ---------------------------------------------------------------------------

describe('NAV_ITEMS', () => {
  it('has exactly 29 items', () => {
    expect(NAV_ITEMS).toHaveLength(29)
  })

  it('every item has required properties', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy()
      expect(item.label_ar).toBeTruthy()
      expect(item.href).toBeTruthy()
      expect(item.iconName).toBeTruthy()
      expect(item.roles.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate hrefs', () => {
    const hrefs = NAV_ITEMS.map(i => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('has non-empty Arabic labels for all items', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label_ar.trim().length).toBeGreaterThan(0)
    }
  })

  it('has non-empty iconName for all items', () => {
    for (const item of NAV_ITEMS) {
      expect(item.iconName.trim().length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// PRIMARY_MOBILE_PATHS
// ---------------------------------------------------------------------------

describe('PRIMARY_MOBILE_PATHS', () => {
  it('has exactly 4 entries', () => {
    expect(PRIMARY_MOBILE_PATHS).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// getNavForRole
// ---------------------------------------------------------------------------

describe('getNavForRole', () => {
  it('all 4 roles get Dashboard (/dashboard)', () => {
    for (const role of ALL_ROLES) {
      const items = getNavForRole(role)
      expect(items.some(i => i.href === '/dashboard')).toBe(true)
    }
  })

  it('all 4 roles get My Profile (/profile)', () => {
    for (const role of ALL_ROLES) {
      const items = getNavForRole(role)
      expect(items.some(i => i.href === '/profile')).toBe(true)
    }
  })

  it('super_admin nav includes admin items (groups, settings, permissions)', () => {
    const items = getNavForRole('super_admin')
    const hrefs = items.map(i => i.href)
    expect(hrefs).toContain('/admin/groups')
    expect(hrefs).toContain('/admin/settings')
    expect(hrefs).toContain('/admin/permissions')
  })

  it('member nav excludes admin-only items (settings, permissions, role permissions)', () => {
    const items = getNavForRole('member')
    const hrefs = items.map(i => i.href)
    expect(hrefs).not.toContain('/admin/settings')
    expect(hrefs).not.toContain('/admin/permissions')
    expect(hrefs).not.toContain('/admin/settings/roles')
  })

  it('group_leader nav includes My Group (/my-group)', () => {
    const items = getNavForRole('group_leader')
    const hrefs = items.map(i => i.href)
    expect(hrefs).toContain('/my-group')
  })

  it('ministry_leader sees Ministries (/admin/ministries)', () => {
    const items = getNavForRole('ministry_leader')
    const hrefs = items.map(i => i.href)
    expect(hrefs).toContain('/admin/ministries')
  })
})

// ---------------------------------------------------------------------------
// getNavForUser
// ---------------------------------------------------------------------------

describe('getNavForUser', () => {
  it('hides permission-gated items when permission is false', () => {
    const perms = makePermissions(false)
    const items = getNavForUser('member', perms)

    // All permission-gated items should be excluded
    const permissionGatedItems = NAV_ITEMS.filter(i => i.permission && i.roles.includes('member'))
    for (const gatedItem of permissionGatedItems) {
      expect(items.some(i => i.href === gatedItem.href)).toBe(false)
    }
  })

  it('shows permission-gated items when permission is true', () => {
    const perms = makePermissions(true)
    const items = getNavForUser('member', perms)

    // All permission-gated items available to member should be included
    const permissionGatedItems = NAV_ITEMS.filter(i => i.permission && i.roles.includes('member'))
    for (const gatedItem of permissionGatedItems) {
      expect(items.some(i => i.href === gatedItem.href)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// getSecondaryNavItems
// ---------------------------------------------------------------------------

describe('getSecondaryNavItems', () => {
  it('excludes PRIMARY_MOBILE_PATHS', () => {
    const allItems = getNavForRole('super_admin')
    const secondary = getSecondaryNavItems(allItems)

    for (const path of PRIMARY_MOBILE_PATHS) {
      expect(secondary.some(i => i.href === path)).toBe(false)
    }
  })

  it('keeps items not in PRIMARY_MOBILE_PATHS', () => {
    const allItems = getNavForRole('super_admin')
    const secondary = getSecondaryNavItems(allItems)
    const nonPrimaryItems = allItems.filter(i => !PRIMARY_MOBILE_PATHS.includes(i.href))

    expect(secondary).toHaveLength(nonPrimaryItems.length)
    for (const item of nonPrimaryItems) {
      expect(secondary.some(i => i.href === item.href)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// getNavSections
// ---------------------------------------------------------------------------

describe('getNavSections', () => {
  it('groups items by section (English)', () => {
    const items = getNavForRole('super_admin')
    const sections = getNavSections(items, 'en')

    expect(sections.length).toBeGreaterThan(0)
    for (const group of sections) {
      expect(group.section).toBeTruthy()
      expect(group.items.length).toBeGreaterThan(0)
      // Every item in the group should have the matching section
      for (const item of group.items) {
        expect(item.section).toBe(group.section)
      }
    }
  })

  it('groups items by section_ar (Arabic)', () => {
    const items = getNavForRole('super_admin')
    const sections = getNavSections(items, 'ar')

    expect(sections.length).toBeGreaterThan(0)
    for (const group of sections) {
      expect(group.section).toBeTruthy()
      expect(group.items.length).toBeGreaterThan(0)
      // Every item in the group should have the matching section_ar
      for (const item of group.items) {
        expect(item.section_ar).toBe(group.section)
      }
    }
  })
})
