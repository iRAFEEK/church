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

import type { SupabaseClient } from '@supabase/supabase-js'

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
  hasPhonePermission = false,
): boolean {
  // super_admin always sees phone, no matter the setting.
  if (role === 'super_admin') return true

  // A super_admin can grant the per-user `can_view_member_phone` permission to a
  // specific leader — that override wins over the church-wide setting.
  if (hasPhonePermission) return true

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

/**
 * Server helper: fetch the church's directory-visibility setting (one lookup) and
 * decide whether the caller (by role) may see member phone numbers. Used to apply the
 * same privacy gate church-wide (outreach, serving rosters, group/ministry detail,
 * at-risk) — not just the member directory. Fails closed to the privacy-safe default
 * ('leaders_only') on any error.
 */
export async function canCallerViewMemberPhones(
  supabase: SupabaseClient,
  churchId: string,
  role: string,
  hasPhonePermission = false,
): Promise<boolean> {
  // Per-user grant short-circuits the church lookup entirely.
  if (role === 'super_admin' || hasPhonePermission) return true
  try {
    const { data, error } = await supabase
      .from('churches')
      .select('member_directory_visibility')
      .eq('id', churchId)
      .single()
    const visibility = (!error && data?.member_directory_visibility
      ? data.member_directory_visibility
      : 'leaders_only') as MemberDirectoryVisibility
    return canViewMemberPhone(visibility, role as ViewerRole, hasPhonePermission)
  } catch {
    return canViewMemberPhone('leaders_only', role as ViewerRole, hasPhonePermission)
  }
}
