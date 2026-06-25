import { describe, it, expect } from 'vitest'
import {
  canViewMemberPhone,
  MEMBER_DIRECTORY_VISIBILITY_VALUES,
  type MemberDirectoryVisibility,
  type ViewerRole,
} from '@/lib/members/visibility'

describe('canViewMemberPhone', () => {
  // Full 3 visibility levels x 4 roles truth table.
  // (The task asks for "all 9 combinations" = 3 levels x 3 non-superadmin roles;
  //  we additionally assert super_admin always-true for completeness.)
  const cases: Array<[MemberDirectoryVisibility, ViewerRole, boolean]> = [
    // everyone — anyone with directory access sees phone
    ['everyone', 'member', true],
    ['everyone', 'group_leader', true],
    ['everyone', 'ministry_leader', true],
    ['everyone', 'super_admin', true],

    // leaders_only — only ministry_leader + super_admin
    ['leaders_only', 'member', false],
    ['leaders_only', 'group_leader', false],
    ['leaders_only', 'ministry_leader', true],
    ['leaders_only', 'super_admin', true],

    // hidden — only super_admin
    ['hidden', 'member', false],
    ['hidden', 'group_leader', false],
    ['hidden', 'ministry_leader', false],
    ['hidden', 'super_admin', true],
  ]

  it.each(cases)('visibility=%s role=%s -> %s', (visibility, role, expected) => {
    expect(canViewMemberPhone(visibility, role)).toBe(expected)
  })

  it('super_admin always sees phone regardless of visibility', () => {
    for (const v of MEMBER_DIRECTORY_VISIBILITY_VALUES) {
      expect(canViewMemberPhone(v, 'super_admin')).toBe(true)
    }
  })

  it('fails closed to leaders_only behavior for an unknown visibility value', () => {
    const bogus = 'something_else' as unknown as MemberDirectoryVisibility
    expect(canViewMemberPhone(bogus, 'member')).toBe(false)
    expect(canViewMemberPhone(bogus, 'group_leader')).toBe(false)
    expect(canViewMemberPhone(bogus, 'ministry_leader')).toBe(true)
    expect(canViewMemberPhone(bogus, 'super_admin')).toBe(true)
  })

  it('exposes exactly the three supported visibility values', () => {
    expect([...MEMBER_DIRECTORY_VISIBILITY_VALUES]).toEqual([
      'everyone',
      'leaders_only',
      'hidden',
    ])
  })
})
