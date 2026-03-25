import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { ConferenceTeamDashboard } from '@/components/conference/ConferenceTeamDashboard'

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>
}) {
  const { id, teamId } = await params
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events && !user.resolvedPermissions.can_manage_conference_teams) {
    redirect('/dashboard')
  }

  const locale = await getLocale()
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  const { data: team } = await supabase
    .from('conference_teams')
    .select('id, name, name_ar, muster_point, muster_point_ar, target_headcount, area_id')
    .eq('id', teamId)
    .eq('event_id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!team) notFound()

  const [
    { data: members },
    { data: tasks },
    { data: resources },
    { data: broadcasts },
  ] = await Promise.all([
    supabase
      .from('conference_team_members')
      .select('id, role, checkin_status, shift_start, shift_end, profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, phone)')
      .eq('team_id', teamId)
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('role')
      .limit(200),
    supabase
      .from('conference_tasks')
      .select('id, title, status, priority, due_at, assigned_to')
      .eq('team_id', teamId)
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('priority', { ascending: false })
      .limit(100),
    supabase
      .from('conference_resources')
      .select('id, name, name_ar, resource_type, status, quantity_needed, estimated_cost')
      .eq('team_id', teamId)
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .limit(100),
    supabase
      .from('conference_broadcasts')
      .select('id, message, message_ar, is_urgent, scope, created_at, sender:sent_by(first_name, last_name, first_name_ar, last_name_ar)')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .or(`scope.eq.all,team_id.eq.${teamId}`)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Supabase returns FK joins as arrays without the Database generic; cast through unknown.
  type MemberRow = Parameters<typeof ConferenceTeamDashboard>[0]['members'][0]
  type BroadcastRow = Parameters<typeof ConferenceTeamDashboard>[0]['broadcasts'][0]

  return (
    <ConferenceTeamDashboard
      eventId={id}
      team={team as Parameters<typeof ConferenceTeamDashboard>[0]['team']}
      members={(members || []).map((m) => ({
        ...m,
        profile: Array.isArray(m.profile) ? (m.profile[0] || null) : m.profile,
      })) as unknown as MemberRow[]}
      tasks={(tasks || []) as Parameters<typeof ConferenceTeamDashboard>[0]['tasks']}
      resources={(resources || []) as Parameters<typeof ConferenceTeamDashboard>[0]['resources']}
      broadcasts={(broadcasts || []).map((b) => ({
        ...b,
        sender: Array.isArray(b.sender) ? (b.sender[0] || null) : b.sender,
      })) as unknown as BroadcastRow[]}
      locale={locale}
    />
  )
}
