import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { TeamLeaderHub } from '@/components/conference/TeamLeaderHub'

export default async function MyTeamPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const user = await getCurrentUserWithRole()
  const locale = await getLocale()
  const supabase = await createClient()

  // Find leadership role for this user in this event
  const { data: membership } = await supabase
    .from('conference_team_members')
    .select('id, role, team_id, shift_start, shift_end')
    .eq('profile_id', user.profile.id)
    .eq('event_id', eventId)
    .eq('church_id', user.profile.church_id)
    .in('role', ['team_leader', 'sub_leader', 'area_director', 'conference_director'])
    .maybeSingle()

  if (!membership) redirect(`/conference/${eventId}`)

  const teamId = membership.team_id

  // Parallel fetch all scoped data
  const [
    { data: event },
    { data: team },
    { data: members },
    { data: tasks },
    { data: resources },
    { data: broadcasts },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, title_ar, starts_at, ends_at')
      .eq('id', eventId)
      .eq('church_id', user.profile.church_id)
      .single(),
    supabase
      .from('conference_teams')
      .select('id, name, name_ar, target_headcount, area_id, sort_order')
      .eq('id', teamId)
      .eq('church_id', user.profile.church_id)
      .single(),
    supabase
      .from('conference_team_members')
      .select(
        'id, role, checkin_status, checked_in_at, checked_out_at, shift_start, shift_end, task_notes, profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)',
      )
      .eq('team_id', teamId)
      .eq('church_id', user.profile.church_id)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase
      .from('conference_tasks')
      .select('id, title, title_ar, status, priority, assignee_id, due_at, created_at')
      .eq('team_id', teamId)
      .eq('church_id', user.profile.church_id)
      .order('priority', { ascending: false })
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from('conference_resources')
      .select('id, name, name_ar, resource_type, quantity, unit, status, notes, created_at')
      .eq('team_id', teamId)
      .eq('church_id', user.profile.church_id)
      .limit(100),
    supabase
      .from('conference_broadcasts')
      .select(
        'id, message, message_ar, is_urgent, created_at, sender:sent_by(first_name, last_name, first_name_ar, last_name_ar)',
      )
      .eq('event_id', eventId)
      .eq('church_id', user.profile.church_id)
      .or(`team_id.eq.${teamId},team_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!event || !team) notFound()

  return (
    <TeamLeaderHub
      eventId={eventId}
      teamId={teamId}
      membershipId={membership.id}
      myRole={membership.role}
      myShiftStart={membership.shift_start}
      myShiftEnd={membership.shift_end}
      event={event}
      team={team}
      initialMembers={(members || []) as unknown as Parameters<typeof TeamLeaderHub>[0]['initialMembers']}
      initialTasks={(tasks || []) as unknown as Parameters<typeof TeamLeaderHub>[0]['initialTasks']}
      initialResources={(resources || []) as unknown as Parameters<typeof TeamLeaderHub>[0]['initialResources']}
      initialBroadcasts={(broadcasts || []) as unknown as Parameters<typeof TeamLeaderHub>[0]['initialBroadcasts']}
      locale={locale}
      isAdmin={false}
    />
  )
}
