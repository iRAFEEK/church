// Per-church member-directory privacy (Track A5).
//
// Controls who can see member CONTACT INFO (phone numbers) inside the member
// directory. This is layered ON TOP of the existing `can_view_members`
// permission — a viewer must already be allowed into the directory; this only
// decides whether the phone column/field is revealed to them.
//
//   - 'everyone'      → anyone who can view the directory sees phone numbers.
//   - 'leaders_only'  → only ministry_leader or super_admin (privacy-safe default).
//   - 'hidden'        → only super_admin.
//
// super_admin ALWAYS sees phone numbers regardless of the setting.

export type MemberDirectoryVisibility = 'everyone' | 'leaders_only' | 'hidden'

export type ViewerRole = 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'

export const MEMBER_DIRECTORY_VISIBILITY_VALUES: readonly MemberDirectoryVisibility[] = [
  'everyone',
  'leaders_only',
  'hidden',
] as const

/**
 * Decide whether a viewer with the given role may see member phone numbers,
 * given the church's directory-visibility setting.
 *
 * Pure + dependency-free so it can be unit-tested and reused on both the
 * server (pages, API routes) and any future client usage.
 */
export function canViewMemberPhone(
  visibility: MemberDirectoryVisibility,
  role: ViewerRole,
): boolean {
  // super_admin always sees phone, no matter the setting.
  if (role === 'super_admin') return true

  switch (visibility) {
    case 'everyone':
      return true
    case 'leaders_only':
      return role === 'ministry_leader'
    case 'hidden':
      // Only super_admin (handled above).
      return false
    default:
      // Unknown / null setting → fail closed to the privacy-safe default.
      return role === 'ministry_leader'
  }
}
