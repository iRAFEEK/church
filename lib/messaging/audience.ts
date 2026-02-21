import { createClient } from '@/lib/supabase/server'

export interface AudienceTarget {
  type: 'all_church' | 'roles' | 'groups' | 'ministries' | 'statuses' | 'visitors' | 'gender'
  roles?: ('member' | 'group_leader' | 'ministry_leader' | 'super_admin')[]
  groupIds?: string[]
  ministryIds?: string[]
  statuses?: ('active' | 'inactive' | 'at_risk' | 'visitor')[]
  visitorStatuses?: ('new' | 'assigned' | 'contacted')[]
  gender?: 'male' | 'female'
}

export interface AudienceResult {
  profileIds: string[]
  visitorPhones: { phone: string; name: string }[]
}

/**
 * Resolves audience targets into a deduplicated list of profile IDs and visitor phones.
 * Multiple targets are unioned together.
 */
export async function resolveAudience(
  churchId: string,
  targets: AudienceTarget[]
): Promise<AudienceResult> {
  const supabase = await createClient()
  const profileIdSet = new Set<string>()
  const visitorPhoneMap = new Map<string, string>() // phone → name

  for (const target of targets) {
    switch (target.type) {
      case 'all_church': {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('church_id', churchId)
          .eq('onboarding_completed', true)
        data?.forEach(p => profileIdSet.add(p.id))
        break
      }

      case 'roles': {
        if (!target.roles?.length) break
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('church_id', churchId)
          .eq('onboarding_completed', true)
          .in('role', target.roles)
        data?.forEach(p => profileIdSet.add(p.id))
        break
      }

      case 'groups': {
        if (!target.groupIds?.length) break
        const { data } = await supabase
          .from('group_members')
          .select('profile_id')
          .eq('church_id', churchId)
          .eq('is_active', true)
          .in('group_id', target.groupIds)
        data?.forEach(gm => profileIdSet.add(gm.profile_id))
        break
      }

      case 'ministries': {
        if (!target.ministryIds?.length) break
        // First get all groups in these ministries
        const { data: groups } = await supabase
          .from('groups')
          .select('id')
          .eq('church_id', churchId)
          .eq('is_active', true)
          .in('ministry_id', target.ministryIds)
        if (!groups?.length) break
        const groupIds = groups.map(g => g.id)
        const { data } = await supabase
          .from('group_members')
          .select('profile_id')
          .eq('church_id', churchId)
          .eq('is_active', true)
          .in('group_id', groupIds)
        data?.forEach(gm => profileIdSet.add(gm.profile_id))
        break
      }

      case 'statuses': {
        if (!target.statuses?.length) break
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('church_id', churchId)
          .eq('onboarding_completed', true)
          .in('status', target.statuses)
        data?.forEach(p => profileIdSet.add(p.id))
        break
      }

      case 'visitors': {
        if (!target.visitorStatuses?.length) break
        const { data } = await supabase
          .from('visitors')
          .select('phone, first_name, last_name')
          .eq('church_id', churchId)
          .in('status', target.visitorStatuses)
          .not('phone', 'is', null)
        data?.forEach(v => {
          if (v.phone) {
            visitorPhoneMap.set(v.phone, `${v.first_name} ${v.last_name}`.trim())
          }
        })
        break
      }

      case 'gender': {
        if (!target.gender) break
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('church_id', churchId)
          .eq('onboarding_completed', true)
          .eq('gender', target.gender)
        data?.forEach(p => profileIdSet.add(p.id))
        break
      }
    }
  }

  return {
    profileIds: Array.from(profileIdSet),
    visitorPhones: Array.from(visitorPhoneMap.entries()).map(([phone, name]) => ({ phone, name })),
  }
}

/**
 * Returns just the count of recipients for a set of targets (preview).
 */
export async function countAudience(
  churchId: string,
  targets: AudienceTarget[]
): Promise<{ profileCount: number; visitorCount: number; total: number }> {
  const result = await resolveAudience(churchId, targets)
  return {
    profileCount: result.profileIds.length,
    visitorCount: result.visitorPhones.length,
    total: result.profileIds.length + result.visitorPhones.length,
  }
}
