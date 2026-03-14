import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves the user's scope — what ministries, groups, and serving areas they lead.
 * Used for scoping data access for leaders.
 */

export interface UserScope {
  ministryIds: string[]
  groupIds: string[]
  servingAreaIds: string[]
  isWorshipMinistryMember: boolean
}

export async function resolveUserScope(
  // Structural type to accept both real SupabaseClient and test mocks
  supabase: Pick<SupabaseClient, 'from'>,
  profileId: string,
  churchId: string
): Promise<UserScope> {
  const [ministryRes, groupRes, servingRes, worshipRes] = await Promise.all([
    // Ministries where user is leader or co-leader
    supabase
      .from('ministry_members')
      .select('ministry_id')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .in('role_in_ministry', ['leader', 'co_leader']),

    // Groups where user is leader or co-leader
    supabase
      .from('group_members')
      .select('group_id')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .in('role_in_group', ['leader', 'co_leader']),

    // Serving areas where user is a leader
    supabase
      .from('serving_area_leaders')
      .select('serving_area_id')
      .eq('profile_id', profileId)
      .eq('church_id', churchId),

    // Check if user is a member of any worship/music ministry
    supabase
      .from('ministry_members')
      .select('ministry:ministry_id(name)')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .limit(50),
  ])

  const ministryIds = (ministryRes.data || []).map((m: { ministry_id: string }) => m.ministry_id)
  const groupIds = (groupRes.data || []).map((g: { group_id: string }) => g.group_id)
  const servingAreaIds = (servingRes.data || []).map((s: { serving_area_id: string }) => s.serving_area_id)

  // Check worship membership by name pattern
  const worshipRecords = (worshipRes.data || []) as unknown as Array<{ ministry?: { name: string } | null }>
  const isWorshipMinistryMember = worshipRecords.some((m) => {
    const name = (m.ministry?.name || '').toLowerCase()
    return name.includes('worship') || name.includes('music') || name.includes('ترانيم') || name.includes('تسبيح')
  })

  return { ministryIds, groupIds, servingAreaIds, isWorshipMinistryMember }
}
