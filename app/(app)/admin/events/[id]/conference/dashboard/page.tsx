import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { ConferenceMissionControl } from '@/components/conference/ConferenceMissionControl'

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_view_conference_dashboard && !user.resolvedPermissions.can_manage_events) {
    redirect('/dashboard')
  }

  const locale = await getLocale()
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, title_ar, conference_mode')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  // Fetch dashboard data in parallel
  const [
    { data: memberCounts },
    { data: areas },
    { data: blockedTasks },
    { data: recentBroadcasts },
  ] = await Promise.all([
    supabase
      .from('conference_team_members')
      .select('checkin_status')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .limit(5000),
    supabase
      .from('conference_areas')
      .select('id, name, name_ar')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(100),
    supabase
      .from('conference_tasks')
      .select('id, title, team_id, team:team_id(name, name_ar)')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .eq('status', 'blocked')
      .limit(20),
    supabase
      .from('conference_broadcasts')
      .select('id, message, message_ar, is_urgent, scope, created_at, sender:sent_by(first_name, last_name, first_name_ar, last_name_ar)')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Build per-area checkin stats
  const areaMemberCounts: Record<string, { total: number; checked_in: number }> = {}
  for (const area of (areas || [])) {
    areaMemberCounts[area.id] = { total: 0, checked_in: 0 }
  }

  const totalStats = { total: 0, checked_in: 0, checked_out: 0, no_show: 0 }
  for (const m of (memberCounts || [])) {
    totalStats.total++
    if (m.checkin_status === 'checked_in') totalStats.checked_in++
    if (m.checkin_status === 'checked_out') totalStats.checked_out++
    if (m.checkin_status === 'no_show') totalStats.no_show++
  }

  // Supabase returns FK joins as arrays without the Database generic; cast through unknown.
  type BlockedTask = { id: string; title: string; team: { name: string; name_ar: string | null } | null }
  type RecentBroadcast = Parameters<typeof ConferenceMissionControl>[0]['recentBroadcasts'][0]

  return (
    <ConferenceMissionControl
      eventId={id}
      churchId={user.profile.church_id}
      totalStats={totalStats}
      areas={(areas || []) as Array<{ id: string; name: string; name_ar: string | null }>}
      blockedTasks={(blockedTasks || []).map((t) => ({
        ...t,
        team: Array.isArray(t.team) ? (t.team[0] || null) : t.team,
      })) as unknown as BlockedTask[]}
      recentBroadcasts={(recentBroadcasts || []).map((b) => ({
        ...b,
        sender: Array.isArray(b.sender) ? (b.sender[0] || null) : b.sender,
      })) as unknown as RecentBroadcast[]}
      locale={locale}
    />
  )
}
