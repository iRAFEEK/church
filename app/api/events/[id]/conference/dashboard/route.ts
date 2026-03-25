import { unstable_cache } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { createClient } from '@/lib/supabase/server'
import type { ConferenceDashboard } from '@/types'

// Cached dashboard query — 15s TTL, invalidated by revalidateTag on any mutation
async function getConferenceDashboard(eventId: string, churchId: string): Promise<ConferenceDashboard> {
  const supabase = await createClient()

  type MemberRow = { checkin_status: string; team_id: string; event_id: string }
  type TeamRow = { id: string; area_id: string; name: string; name_ar: string | null; target_headcount: number | null }
  type AreaRow = { id: string; name: string; name_ar: string | null }
  type TaskRow = { status: string; priority: string; team_id: string | null; id: string; title: string }
  type ResourceRow = { status: string }
  type BroadcastRow = {
    id: string
    church_id: string
    event_id: string
    team_id: string | null
    area_id: string | null
    sent_by: string
    message: string
    message_ar: string | null
    is_urgent: boolean
    created_at: string
    sender: {
      id: string
      first_name: string
      last_name: string
      first_name_ar: string | null
      last_name_ar: string | null
      photo_url: string | null
    }
    read_count: number
  }

  const [
    membersResult,
    teamsResult,
    areasResult,
    tasksResult,
    resourcesResult,
    broadcastsResult,
    readCountsResult,
  ] = await Promise.all([
    // 1. All team members with checkin status for this event
    supabase
      .from('conference_team_members')
      .select('checkin_status, team_id, event_id')
      .eq('event_id', eventId)
      .eq('church_id', churchId),
    // 2. All teams
    supabase
      .from('conference_teams')
      .select('id, area_id, name, name_ar, target_headcount')
      .eq('event_id', eventId)
      .eq('church_id', churchId),
    // 3. All areas
    supabase
      .from('conference_areas')
      .select('id, name, name_ar')
      .eq('event_id', eventId)
      .eq('church_id', churchId),
    // 4. All tasks (status + priority for aggregation)
    supabase
      .from('conference_tasks')
      .select('id, status, priority, team_id, title')
      .eq('event_id', eventId)
      .eq('church_id', churchId),
    // 5. All resources (status for aggregation)
    supabase
      .from('conference_resources')
      .select('status')
      .eq('event_id', eventId)
      .eq('church_id', churchId),
    // 6. Recent 5 broadcasts with sender
    supabase
      .from('conference_broadcasts')
      .select(`id, church_id, event_id, team_id, area_id, sent_by, message, message_ar, is_urgent, created_at,
               sender:sent_by(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)`)
      .eq('event_id', eventId)
      .eq('church_id', churchId)
      .order('created_at', { ascending: false })
      .limit(5),
    // 7. Read counts per broadcast (last 5 only, joined)
    supabase
      .from('conference_broadcast_reads')
      .select('broadcast_id')
      .in('broadcast_id',
        // We'll compute this from broadcastsResult in a second pass
        // Placeholder — will be cross-referenced below
        []
      ),
  ])

  const members = (membersResult.data || []) as MemberRow[]
  const teams = (teamsResult.data || []) as TeamRow[]
  const areas = (areasResult.data || []) as AreaRow[]
  const tasks = (tasksResult.data || []) as TaskRow[]
  const resources = (resourcesResult.data || []) as ResourceRow[]
  const recentBroadcasts = (broadcastsResult.data || []) as unknown as BroadcastRow[]

  // Read counts for the 5 most recent broadcasts
  let readCounts: { broadcast_id: string }[] = []
  if (recentBroadcasts.length > 0) {
    const broadcastIds = recentBroadcasts.map((b) => b.id)
    const { data: rcData } = await supabase
      .from('conference_broadcast_reads')
      .select('broadcast_id')
      .in('broadcast_id', broadcastIds)
    readCounts = (rcData || []) as { broadcast_id: string }[]
  }

  // Aggregate totals
  const totals = {
    volunteers: members.length,
    checked_in: members.filter((m) => m.checkin_status === 'checked_in').length,
    checked_out: members.filter((m) => m.checkin_status === 'checked_out').length,
    no_show: members.filter((m) => m.checkin_status === 'no_show').length,
  }

  // Members by team
  const membersByTeam = new Map<string, MemberRow[]>()
  for (const m of members) {
    const arr = membersByTeam.get(m.team_id) || []
    arr.push(m)
    membersByTeam.set(m.team_id, arr)
  }

  // Tasks by team
  const tasksByTeam = new Map<string, TaskRow[]>()
  for (const t of tasks) {
    if (!t.team_id) continue
    const arr = tasksByTeam.get(t.team_id) || []
    arr.push(t)
    tasksByTeam.set(t.team_id, arr)
  }

  // Teams by area
  const teamsByArea = new Map<string, TeamRow[]>()
  for (const team of teams) {
    const arr = teamsByArea.get(team.area_id) || []
    arr.push(team)
    teamsByArea.set(team.area_id, arr)
  }

  // By-area stats
  const byArea: ConferenceDashboard['by_area'] = areas.map((area) => {
    const areaTeams = teamsByArea.get(area.id) || []
    let total = 0
    let checkedIn = 0
    let openTasks = 0
    let blockedTasks = 0

    for (const team of areaTeams) {
      const tMembers = membersByTeam.get(team.id) || []
      const tTasks = tasksByTeam.get(team.id) || []
      total += tMembers.length
      checkedIn += tMembers.filter((m) => m.checkin_status === 'checked_in').length
      openTasks += tTasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length
      blockedTasks += tTasks.filter((t) => t.status === 'blocked').length
    }

    return {
      area_id: area.id,
      area_name: area.name,
      area_name_ar: area.name_ar,
      total,
      checked_in: checkedIn,
      open_tasks: openTasks,
      blocked_tasks: blockedTasks,
    }
  })

  // By-team stats
  const byTeam: ConferenceDashboard['by_team'] = teams.map((team) => {
    const tMembers = membersByTeam.get(team.id) || []
    return {
      team_id: team.id,
      team_name: team.name,
      team_name_ar: team.name_ar,
      area_id: team.area_id,
      total: tMembers.length,
      checked_in: tMembers.filter((m) => m.checkin_status === 'checked_in').length,
      target_headcount: team.target_headcount,
    }
  })

  // Task counts
  const taskStats: ConferenceDashboard['tasks'] = {
    open: tasks.filter((t) => t.status === 'open').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    done: tasks.filter((t) => t.status === 'done').length,
    critical_open: tasks.filter((t) => t.priority === 'critical' && t.status !== 'done').length,
  }

  // Resource counts
  const resourceStats: ConferenceDashboard['resources'] = {
    needed: resources.filter((r) => r.status === 'needed').length,
    requested: resources.filter((r) => r.status === 'requested').length,
    confirmed: resources.filter((r) => r.status === 'confirmed').length,
    delivered: resources.filter((r) => r.status === 'delivered').length,
  }

  // Read count by broadcast
  const readCountByBroadcast = new Map<string, number>()
  for (const rc of readCounts) {
    readCountByBroadcast.set(rc.broadcast_id, (readCountByBroadcast.get(rc.broadcast_id) || 0) + 1)
  }

  const recentBroadcastsWithCount: ConferenceDashboard['recent_broadcasts'] = recentBroadcasts.map((b) => ({
    ...b,
    read_count: readCountByBroadcast.get(b.id) || 0,
  }))

  // Alert flags
  const alertFlags: ConferenceDashboard['alert_flags'] = []

  // Blocked task flags
  for (const task of tasks.filter((t) => t.status === 'blocked')) {
    alertFlags.push({
      type: 'blocked_task',
      task_id: task.id,
      team_id: task.team_id ?? undefined,
      message: `Blocked task: ${task.title}`,
      message_ar: `مهمة محجوبة: ${task.title}`,
    })
  }

  // Understaffed team flags (checked_in < target * 0.7)
  for (const team of teams) {
    if (!team.target_headcount) continue
    const tMembers = membersByTeam.get(team.id) || []
    const checkedIn = tMembers.filter((m) => m.checkin_status === 'checked_in').length
    if (checkedIn < team.target_headcount * 0.7) {
      alertFlags.push({
        type: 'team_understaffed',
        team_id: team.id,
        message: `Team understaffed: ${team.name} (${checkedIn}/${team.target_headcount})`,
        message_ar: `فريق يعاني من نقص في الكوادر: ${team.name_ar || team.name} (${checkedIn}/${team.target_headcount})`,
      })
    }
  }

  return {
    totals,
    by_area: byArea,
    by_team: byTeam,
    tasks: taskStats,
    resources: resourceStats,
    recent_broadcasts: recentBroadcastsWithCount,
    alert_flags: alertFlags,
  }
}

// GET /api/events/[id]/conference/dashboard — aggregated conference dashboard
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id

  // Verify event belongs to this church
  const { data: event } = await supabase
    .from('events')
    .select('id, conference_mode')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 })
  }

  const cachedFn = unstable_cache(
    () => getConferenceDashboard(eventId, profile.church_id),
    [`conference-dashboard-${eventId}`],
    { tags: [`conference-dashboard-${eventId}`], revalidate: 15 }
  )

  const data = await cachedFn()
  return { data }
}, { requirePermissions: ['can_view_conference_dashboard'] })
