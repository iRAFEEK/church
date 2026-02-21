import { createClient } from '@/lib/supabase/server'
import { notifyAtRiskMember } from '@/lib/messaging/triggers'

/**
 * Count consecutive absences for a profile in a group
 * (looks at the last N completed gatherings, counts from most recent)
 */
export async function getConsecutiveAbsences(
  profileId: string,
  groupId: string,
  lookback = 6
): Promise<number> {
  const supabase = await createClient()

  // Get last N completed gatherings for this group
  const { data: gatherings } = await supabase
    .from('gatherings')
    .select('id')
    .eq('group_id', groupId)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(lookback)

  if (!gatherings || gatherings.length === 0) return 0

  const gatheringIds = gatherings.map(g => g.id)

  // Get attendance records for this member in those gatherings
  const { data: records } = await supabase
    .from('attendance')
    .select('gathering_id, status')
    .eq('profile_id', profileId)
    .in('gathering_id', gatheringIds)

  const recordMap = new Map(records?.map(r => [r.gathering_id, r.status]) || [])

  // Count consecutive absences from most recent
  let streak = 0
  for (const g of gatherings) {
    const status = recordMap.get(g.id)
    if (!status || status === 'absent') {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * After a gathering is completed, check all active members
 * and flag anyone with 2+ consecutive absences as at_risk
 */
export async function checkAndFlagAtRisk(gatheringId: string): Promise<void> {
  const supabase = await createClient()

  const { data: gathering } = await supabase
    .from('gatherings')
    .select('group_id, church_id')
    .eq('id', gatheringId)
    .single()

  if (!gathering) return

  // Get active members of this group
  const { data: members } = await supabase
    .from('group_members')
    .select('profile_id')
    .eq('group_id', gathering.group_id)
    .eq('is_active', true)

  if (!members) return

  for (const member of members) {
    const streak = await getConsecutiveAbsences(member.profile_id, gathering.group_id)

    if (streak >= 2) {
      const { count } = await supabase
        .from('profiles')
        .update({ status: 'at_risk' })
        .eq('id', member.profile_id)
        .eq('status', 'active') // only flag if currently active

      // Only notify if status actually changed (was active, now at_risk)
      if (count && count > 0) {
        notifyAtRiskMember(member.profile_id, gathering.group_id, gathering.church_id, streak).catch(console.error)
      }
    }
  }
}
