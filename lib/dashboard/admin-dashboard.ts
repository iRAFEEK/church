import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminDashboardData,
  WeeklyAttendancePoint,
  VisitorPipelineItem,
  AttentionItem,
  UpcomingItem,
  GroupHealthRow,
} from '@/types/dashboard'
import {
  startOfWeek,
  startOfMonth,
  weeksAgo,
  endOfWeek,
  daysFromNow,
  getWeekNumber,
  formatWeekLabel,
} from './shared-queries'

// ─── Row shapes for Supabase join queries (no Database generic) ───

interface AttendanceWithGatheringRow {
  status: string
  group_id?: string
  gatherings?: { scheduled_at: string; status: string } | null
}

interface VisitorStatusRow {
  status: string
}

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar?: string | null
  last_name_ar?: string | null
}

interface VisitorRow {
  id: string
  first_name: string
  last_name: string
}

interface SlotWithSignupsRow {
  id: string
  title: string | null
  title_ar: string | null
  max_volunteers: number | null
  serving_signups?: Array<{ id: string; status: string }> | null
}

interface GatheringRow {
  id: string
  scheduled_at: string
  topic: string | null
  topic_ar?: string | null
  groups?: { id: string; name: string; name_ar: string | null } | null
}

interface EventRow {
  id: string
  title: string | null
  title_ar: string | null
  starts_at: string
}

interface SlotWithAreaRow {
  id: string
  title: string | null
  title_ar: string | null
  date: string
  serving_areas?: { name: string; name_ar: string | null } | null
}

interface GroupWithHealthRow {
  id: string
  name: string
  name_ar: string | null
  leader_id: string | null
  profiles?: {
    first_name: string | null; last_name: string | null
    first_name_ar: string | null; last_name_ar: string | null
  } | null
  group_members?: Array<{
    id: string; is_active: boolean
    profiles?: { status: string } | null
  }> | null
}

interface GroupMemberProfileRow {
  profile_id: string
}

interface AtRiskGroupMemberRow {
  profiles?: {
    id: string; first_name: string | null; last_name: string | null
    first_name_ar: string | null; last_name_ar: string | null
  } | null
}

// ─── Admin Dashboard ──────────────────────────────

export async function fetchAdminDashboard(
  supabase: SupabaseClient,
  _profileId: string,
  churchId: string,
  slaHours: number = 48
): Promise<AdminDashboardData> {
  const now = new Date()
  const slaThreshold = new Date(now.getTime() - slaHours * 60 * 60 * 1000).toISOString()

  const [
    activeMembersRes,
    newThisMonthRes,
    visitorsThisWeekRes,
    slaBreachedRes,
    attendanceRateRes,
    upcomingEventsRes,
    attendanceTrendRes,
    visitorPipelineRes,
    atRiskRes,
    slaVisitorsRes,
    unfilledSlotsRes,
    upcomingGatheringsRes,
    upcomingEventsListRes,
    upcomingSlotsRes,
    groupsRes,
  ] = await Promise.all([
    // 1. Active members
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('status', 'active')
      .eq('onboarding_completed', true),

    // 2. New this month
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('onboarding_completed', true)
      .gte('created_at', startOfMonth()),

    // 3. Visitors this week
    supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .gte('visited_at', startOfWeek()),

    // 4. SLA-breached visitors
    supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .in('status', ['new', 'assigned'])
      .lte('visited_at', slaThreshold),

    // 5. Attendance rate (last 4 weeks)
    supabase
      .from('attendance')
      .select('status, gatherings!inner(status, scheduled_at)')
      .eq('church_id', churchId)
      .gte('gatherings.scheduled_at', weeksAgo(4)),

    // 6. Upcoming events (next 30 days)
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('status', 'published')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', daysFromNow(30)),

    // 7. Attendance trend (last 12 weeks)
    supabase
      .from('attendance')
      .select('status, gatherings!inner(scheduled_at, status)')
      .eq('church_id', churchId)
      .gte('gatherings.scheduled_at', weeksAgo(12)),

    // 8. Visitor pipeline
    supabase
      .from('visitors')
      .select('status')
      .eq('church_id', churchId),

    // 9. At-risk members (attention)
    supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar')
      .eq('church_id', churchId)
      .eq('status', 'at_risk')
      .limit(5),

    // 10. SLA visitors (attention)
    supabase
      .from('visitors')
      .select('id, first_name, last_name')
      .eq('church_id', churchId)
      .in('status', ['new', 'assigned'])
      .lte('visited_at', slaThreshold)
      .limit(5),

    // 11. Unfilled slots (attention)
    supabase
      .from('serving_slots')
      .select('id, title, title_ar, max_volunteers, serving_signups(id, status)')
      .eq('church_id', churchId)
      .gte('date', now.toISOString().split('T')[0])
      .limit(20),

    // 12. Upcoming gatherings this week
    supabase
      .from('gatherings')
      .select('id, scheduled_at, topic, topic_ar, groups!inner(id, name, name_ar)')
      .eq('church_id', churchId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', endOfWeek())
      .order('scheduled_at', { ascending: true })
      .limit(5),

    // 13. Upcoming events this week
    supabase
      .from('events')
      .select('id, title, title_ar, starts_at')
      .eq('church_id', churchId)
      .eq('status', 'published')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', endOfWeek())
      .order('starts_at', { ascending: true })
      .limit(5),

    // 14. Upcoming serving slots this week
    supabase
      .from('serving_slots')
      .select('id, title, title_ar, date, serving_areas(name, name_ar)')
      .eq('church_id', churchId)
      .gte('date', now.toISOString().split('T')[0])
      .lte('date', endOfWeek().split('T')[0])
      .order('date', { ascending: true })
      .limit(5),

    // 15. Groups with health data
    supabase
      .from('groups')
      .select('id, name, name_ar, leader_id, profiles!groups_leader_id_fkey(first_name, last_name, first_name_ar, last_name_ar), group_members(id, is_active, profiles(status))')
      .eq('church_id', churchId)
      .eq('is_active', true),
  ])

  // Process attendance rate
  const attendanceRecords = (attendanceRateRes.data || []) as unknown as AttendanceWithGatheringRow[]
  const completedAttendance = attendanceRecords.filter((a) => a.gatherings?.status === 'completed')
  const presentCount = completedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const attendanceRate = completedAttendance.length > 0
    ? Math.round((presentCount / completedAttendance.length) * 100)
    : 0

  // Process attendance trend
  const trendRecords = (attendanceTrendRes.data || []) as unknown as AttendanceWithGatheringRow[]
  const completedTrend = trendRecords.filter((a) => a.gatherings?.status === 'completed')
  const weeklyMap = new Map<number, { present: number; total: number; date: Date }>()

  for (const rec of completedTrend) {
    const date = new Date(rec.gatherings!.scheduled_at)
    const weekNum = getWeekNumber(date)
    if (!weeklyMap.has(weekNum)) {
      weeklyMap.set(weekNum, { present: 0, total: 0, date })
    }
    const week = weeklyMap.get(weekNum)!
    week.total++
    if (rec.status === 'present' || rec.status === 'late') week.present++
  }

  const attendanceTrend: WeeklyAttendancePoint[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, data]) => ({
      weekLabel: formatWeekLabel(data.date),
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }))

  // Process visitor pipeline
  const visitors = (visitorPipelineRes.data || []) as VisitorStatusRow[]
  const pipelineCounts: Record<string, number> = { new: 0, assigned: 0, contacted: 0, converted: 0 }
  for (const v of visitors) {
    if (pipelineCounts[v.status] !== undefined) pipelineCounts[v.status]++
  }
  const visitorPipeline: VisitorPipelineItem[] = [
    { status: 'new', count: pipelineCounts.new },
    { status: 'assigned', count: pipelineCounts.assigned },
    { status: 'contacted', count: pipelineCounts.contacted },
    { status: 'converted', count: pipelineCounts.converted },
  ]

  // Process attention items
  const attentionItems: AttentionItem[] = []

  for (const v of (slaVisitorsRes.data || []) as VisitorRow[]) {
    attentionItems.push({
      type: 'visitor_sla',
      id: v.id,
      label: `${v.first_name} ${v.last_name}`,
      sublabel: 'SLA overdue',
      href: `/admin/visitors`,
    })
  }

  for (const m of (atRiskRes.data || []) as ProfileRow[]) {
    attentionItems.push({
      type: 'at_risk_member',
      id: m.id,
      label: `${m.first_name || ''} ${m.last_name || ''}`.trim() || `${m.first_name_ar || ''} ${m.last_name_ar || ''}`.trim(),
      sublabel: 'At risk',
      href: `/admin/members/${m.id}`,
    })
  }

  for (const slot of (unfilledSlotsRes.data || []) as SlotWithSignupsRow[]) {
    const activeSignups = (slot.serving_signups || []).filter((s) => s.status !== 'cancelled').length
    if (slot.max_volunteers && activeSignups < slot.max_volunteers) {
      attentionItems.push({
        type: 'unfilled_slot',
        id: slot.id,
        label: slot.title || slot.title_ar || '',
        sublabel: `${activeSignups}/${slot.max_volunteers} filled`,
        href: '/serving',
      })
    }
  }

  // Church-wide prayer requests
  const { count: activePrayerCount } = await supabase
    .from('prayer_requests')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .is('group_id', null)
    .eq('status', 'active')

  if (activePrayerCount && activePrayerCount > 0) {
    attentionItems.push({
      type: 'active_prayer',
      id: 'prayers',
      label: `${activePrayerCount} active prayer requests`,
      sublabel: 'Church-wide prayers',
      href: '/admin/prayers',
    })
  }

  // Outreach follow-ups
  const { count: followupCount } = await supabase
    .from('outreach_visits')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .eq('needs_followup', true)

  if (followupCount && followupCount > 0) {
    attentionItems.push({
      type: 'outreach_followup',
      id: 'outreach',
      label: `${followupCount} pending follow-ups`,
      sublabel: 'Outreach visits',
      href: '/admin/outreach',
    })
  }

  // Process upcoming this week
  const upcomingThisWeek: UpcomingItem[] = []

  for (const g of (upcomingGatheringsRes.data || []) as unknown as GatheringRow[]) {
    upcomingThisWeek.push({
      type: 'gathering',
      id: g.id,
      title: g.groups?.name || g.groups?.name_ar || '',
      subtitle: g.topic || g.topic_ar || '',
      datetime: g.scheduled_at,
      href: `/groups/${g.groups?.id}/gathering/${g.id}`,
    })
  }

  for (const e of (upcomingEventsListRes.data || []) as EventRow[]) {
    upcomingThisWeek.push({
      type: 'event',
      id: e.id,
      title: e.title || e.title_ar || '',
      subtitle: '',
      datetime: e.starts_at,
      href: `/events/${e.id}`,
    })
  }

  for (const s of (upcomingSlotsRes.data || []) as unknown as SlotWithAreaRow[]) {
    upcomingThisWeek.push({
      type: 'serving_slot',
      id: s.id,
      title: s.title || s.title_ar || '',
      subtitle: s.serving_areas?.name || s.serving_areas?.name_ar || '',
      datetime: s.date,
      href: '/serving',
    })
  }

  upcomingThisWeek.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())

  // Process group health
  const groups = (groupsRes.data || []) as unknown as GroupWithHealthRow[]
  const groupHealth: GroupHealthRow[] = []

  // Fetch all group attendance for last 8 weeks in a single query, then split into current/prev
  const groupIds = groups.map((g) => g.id)
  let groupAttendanceMap = new Map<string, { present: number; total: number }>()
  let prevGroupAttendanceMap = new Map<string, number>()

  if (groupIds.length > 0) {
    const fourWeeksAgo = weeksAgo(4)
    const { data: allGroupAttendance } = await supabase
      .from('attendance')
      .select('group_id, status, gatherings!inner(status, scheduled_at)')
      .eq('church_id', churchId)
      .in('group_id', groupIds)
      .gte('gatherings.scheduled_at', weeksAgo(8))

    const prevMap = new Map<string, { present: number; total: number }>()
    for (const rec of (allGroupAttendance || []) as unknown as AttendanceWithGatheringRow[]) {
      if (rec.gatherings?.status !== 'completed' || !rec.group_id) continue
      const isRecent = rec.gatherings.scheduled_at >= fourWeeksAgo

      if (isRecent) {
        if (!groupAttendanceMap.has(rec.group_id)) {
          groupAttendanceMap.set(rec.group_id, { present: 0, total: 0 })
        }
        const entry = groupAttendanceMap.get(rec.group_id)!
        entry.total++
        if (rec.status === 'present' || rec.status === 'late') entry.present++
      } else {
        if (!prevMap.has(rec.group_id)) prevMap.set(rec.group_id, { present: 0, total: 0 })
        const entry = prevMap.get(rec.group_id)!
        entry.total++
        if (rec.status === 'present' || rec.status === 'late') entry.present++
      }
    }
    for (const [gId, data] of prevMap) {
      prevGroupAttendanceMap.set(gId, data.total > 0 ? (data.present / data.total) * 100 : 0)
    }
  }

  for (const g of groups) {
    const leader = g.profiles
    const activeMembers = (g.group_members || []).filter((m) => m.is_active)
    const atRiskCount = activeMembers.filter((m) => m.profiles?.status === 'at_risk').length
    const attData = groupAttendanceMap.get(g.id)
    const currentRate = attData && attData.total > 0 ? Math.round((attData.present / attData.total) * 100) : null
    const prevRate = prevGroupAttendanceMap.get(g.id) ?? null

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (currentRate !== null && prevRate !== null) {
      if (currentRate > prevRate + 5) trend = 'up'
      else if (currentRate < prevRate - 5) trend = 'down'
    }

    groupHealth.push({
      id: g.id,
      name: g.name,
      nameAr: g.name_ar,
      leaderName: leader ? `${leader.first_name || ''} ${leader.last_name || ''}`.trim() : '',
      leaderNameAr: leader ? `${leader.first_name_ar || ''} ${leader.last_name_ar || ''}`.trim() || null : null,
      memberCount: activeMembers.length,
      attendanceRate: currentRate,
      atRiskCount,
      trend,
    })
  }

  return {
    kpis: {
      activeMembers: { value: activeMembersRes.count || 0, trend: newThisMonthRes.count || 0 },
      newVisitors: { value: visitorsThisWeekRes.count || 0, slaAlert: slaBreachedRes.count || 0 },
      attendanceRate: { value: attendanceRate },
      upcomingEvents: { value: upcomingEventsRes.count || 0 },
    },
    attendanceTrend,
    visitorPipeline,
    attentionItems: attentionItems.slice(0, 10),
    upcomingThisWeek: upcomingThisWeek.slice(0, 8),
    groupHealth,
  }
}

// ─── Ministry Leader Dashboard (scoped) ──────────

export async function fetchMinistryLeaderDashboard(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string,
  slaHours: number = 48
): Promise<AdminDashboardData> {
  const now = new Date()
  const slaThreshold = new Date(now.getTime() - slaHours * 60 * 60 * 1000).toISOString()

  // 1. Find ministries this user leads
  const { data: myMinistries } = await supabase
    .from('ministry_members')
    .select('ministry_id')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .eq('role_in_ministry', 'leader')

  // Also check legacy leader_id on ministries table
  const { data: legacyMinistries } = await supabase
    .from('ministries')
    .select('id')
    .eq('church_id', churchId)
    .eq('leader_id', profileId)

  const ministryIds = [
    ...new Set([
      ...(myMinistries || []).map(m => m.ministry_id),
      ...(legacyMinistries || []).map(m => m.id),
    ]),
  ]

  // 2. Find groups under those ministries
  let groupIds: string[] = []
  if (ministryIds.length > 0) {
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .in('ministry_id', ministryIds)
    groupIds = (groups || []).map(g => g.id)
  }

  // Also include groups where this user is direct leader/co-leader
  const { data: directGroups } = await supabase
    .from('groups')
    .select('id')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .or(`leader_id.eq.${profileId},co_leader_id.eq.${profileId}`)

  groupIds = [...new Set([...groupIds, ...(directGroups || []).map(g => g.id)])]

  // If no groups found, return empty dashboard
  if (groupIds.length === 0) {
    return {
      kpis: {
        activeMembers: { value: 0, trend: 0 },
        newVisitors: { value: 0, slaAlert: 0 },
        attendanceRate: { value: 0 },
        upcomingEvents: { value: 0 },
      },
      attendanceTrend: [],
      visitorPipeline: [
        { status: 'new', count: 0 },
        { status: 'assigned', count: 0 },
        { status: 'contacted', count: 0 },
        { status: 'converted', count: 0 },
      ],
      attentionItems: [],
      upcomingThisWeek: [],
      groupHealth: [],
    }
  }

  // 3. Fetch scoped data
  const [
    memberCountRes,
    attendanceRateRes,
    visitorsThisWeekRes,
    slaBreachedRes,
    upcomingEventsRes,
    attendanceTrendRes,
    visitorPipelineRes,
    atRiskRes,
    slaVisitorsRes,
    unfilledSlotsRes,
    upcomingGatheringsRes,
    upcomingEventsListRes,
    upcomingSlotsRes,
    groupsRes,
  ] = await Promise.all([
    // 1. Active members in my groups (distinct)
    supabase
      .from('group_members')
      .select('profile_id')
      .in('group_id', groupIds)
      .eq('is_active', true),

    // 2. Attendance rate (last 4 weeks, scoped to my groups)
    supabase
      .from('attendance')
      .select('status, gatherings!inner(status, scheduled_at)')
      .eq('church_id', churchId)
      .in('group_id', groupIds)
      .gte('gatherings.scheduled_at', weeksAgo(4)),

    // 3. Visitors this week (church-wide)
    supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .gte('visited_at', startOfWeek()),

    // 4. SLA-breached visitors (church-wide)
    supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .in('status', ['new', 'assigned'])
      .lte('visited_at', slaThreshold),

    // 5. Upcoming events (church-wide)
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('status', 'published')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', daysFromNow(30)),

    // 6. Attendance trend (last 12 weeks, scoped)
    supabase
      .from('attendance')
      .select('status, gatherings!inner(scheduled_at, status)')
      .eq('church_id', churchId)
      .in('group_id', groupIds)
      .gte('gatherings.scheduled_at', weeksAgo(12)),

    // 7. Visitor pipeline (church-wide)
    supabase
      .from('visitors')
      .select('status')
      .eq('church_id', churchId),

    // 8. At-risk members in my groups
    supabase
      .from('group_members')
      .select('profiles!inner(id, first_name, last_name, first_name_ar, last_name_ar)')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .eq('profiles.status', 'at_risk'),

    // 9. SLA visitors (church-wide attention)
    supabase
      .from('visitors')
      .select('id, first_name, last_name')
      .eq('church_id', churchId)
      .in('status', ['new', 'assigned'])
      .lte('visited_at', slaThreshold)
      .limit(5),

    // 10. Unfilled slots (church-wide)
    supabase
      .from('serving_slots')
      .select('id, title, title_ar, max_volunteers, serving_signups(id, status)')
      .eq('church_id', churchId)
      .gte('date', now.toISOString().split('T')[0])
      .limit(20),

    // 11. Upcoming gatherings this week (scoped)
    supabase
      .from('gatherings')
      .select('id, scheduled_at, topic, topic_ar, groups!inner(id, name, name_ar)')
      .eq('church_id', churchId)
      .eq('status', 'scheduled')
      .in('group_id', groupIds)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', endOfWeek())
      .order('scheduled_at', { ascending: true })
      .limit(5),

    // 12. Upcoming events this week (church-wide)
    supabase
      .from('events')
      .select('id, title, title_ar, starts_at')
      .eq('church_id', churchId)
      .eq('status', 'published')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', endOfWeek())
      .order('starts_at', { ascending: true })
      .limit(5),

    // 13. Upcoming serving slots this week (church-wide)
    supabase
      .from('serving_slots')
      .select('id, title, title_ar, date, serving_areas(name, name_ar)')
      .eq('church_id', churchId)
      .gte('date', now.toISOString().split('T')[0])
      .lte('date', endOfWeek().split('T')[0])
      .order('date', { ascending: true })
      .limit(5),

    // 14. Groups with health data (scoped)
    supabase
      .from('groups')
      .select('id, name, name_ar, leader_id, profiles!groups_leader_id_fkey(first_name, last_name, first_name_ar, last_name_ar), group_members(id, is_active, profiles(status))')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .in('id', groupIds),
  ])

  // Process active members (distinct count)
  const distinctMemberIds = new Set(
    ((memberCountRes.data || []) as GroupMemberProfileRow[]).map((m) => m.profile_id)
  )
  const activeMembers = distinctMemberIds.size

  // Process attendance rate
  const attendanceRecords = (attendanceRateRes.data || []) as unknown as AttendanceWithGatheringRow[]
  const completedAttendance = attendanceRecords.filter((a) => a.gatherings?.status === 'completed')
  const presentCount = completedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const attendanceRate = completedAttendance.length > 0
    ? Math.round((presentCount / completedAttendance.length) * 100)
    : 0

  // Process attendance trend
  const trendRecords = (attendanceTrendRes.data || []) as unknown as AttendanceWithGatheringRow[]
  const completedTrend = trendRecords.filter((a) => a.gatherings?.status === 'completed')
  const weeklyMap = new Map<number, { present: number; total: number; date: Date }>()

  for (const rec of completedTrend) {
    const date = new Date(rec.gatherings!.scheduled_at)
    const weekNum = getWeekNumber(date)
    if (!weeklyMap.has(weekNum)) {
      weeklyMap.set(weekNum, { present: 0, total: 0, date })
    }
    const week = weeklyMap.get(weekNum)!
    week.total++
    if (rec.status === 'present' || rec.status === 'late') week.present++
  }

  const attendanceTrend: WeeklyAttendancePoint[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, data]) => ({
      weekLabel: formatWeekLabel(data.date),
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }))

  // Process visitor pipeline (church-wide)
  const visitors = (visitorPipelineRes.data || []) as VisitorStatusRow[]
  const pipelineCounts: Record<string, number> = { new: 0, assigned: 0, contacted: 0, converted: 0 }
  for (const v of visitors) {
    if (pipelineCounts[v.status] !== undefined) pipelineCounts[v.status]++
  }
  const visitorPipeline: VisitorPipelineItem[] = [
    { status: 'new', count: pipelineCounts.new },
    { status: 'assigned', count: pipelineCounts.assigned },
    { status: 'contacted', count: pipelineCounts.contacted },
    { status: 'converted', count: pipelineCounts.converted },
  ]

  // Process attention items
  const attentionItems: AttentionItem[] = []

  for (const v of (slaVisitorsRes.data || []) as VisitorRow[]) {
    attentionItems.push({
      type: 'visitor_sla',
      id: v.id,
      label: `${v.first_name} ${v.last_name}`,
      sublabel: 'SLA overdue',
      href: `/admin/visitors`,
    })
  }

  // At-risk from scoped groups
  const seenAtRisk = new Set<string>()
  for (const m of (atRiskRes.data || []) as unknown as AtRiskGroupMemberRow[]) {
    const p = m.profiles
    if (!p || seenAtRisk.has(p.id)) continue
    seenAtRisk.add(p.id)
    attentionItems.push({
      type: 'at_risk_member',
      id: p.id,
      label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `${p.first_name_ar || ''} ${p.last_name_ar || ''}`.trim(),
      sublabel: 'At risk',
      href: `/admin/members/${p.id}`,
    })
  }

  for (const slot of (unfilledSlotsRes.data || []) as SlotWithSignupsRow[]) {
    const activeSignups = (slot.serving_signups || []).filter((s) => s.status !== 'cancelled').length
    if (slot.max_volunteers && activeSignups < slot.max_volunteers) {
      attentionItems.push({
        type: 'unfilled_slot',
        id: slot.id,
        label: slot.title || slot.title_ar || '',
        sublabel: `${activeSignups}/${slot.max_volunteers} filled`,
        href: '/serving',
      })
    }
  }

  // Process upcoming this week
  const upcomingThisWeek: UpcomingItem[] = []

  for (const g of (upcomingGatheringsRes.data || []) as unknown as GatheringRow[]) {
    upcomingThisWeek.push({
      type: 'gathering',
      id: g.id,
      title: g.groups?.name || g.groups?.name_ar || '',
      subtitle: g.topic || g.topic_ar || '',
      datetime: g.scheduled_at,
      href: `/groups/${g.groups?.id}/gathering/${g.id}`,
    })
  }

  for (const e of (upcomingEventsListRes.data || []) as EventRow[]) {
    upcomingThisWeek.push({
      type: 'event',
      id: e.id,
      title: e.title || e.title_ar || '',
      subtitle: '',
      datetime: e.starts_at,
      href: `/events/${e.id}`,
    })
  }

  for (const s of (upcomingSlotsRes.data || []) as unknown as SlotWithAreaRow[]) {
    upcomingThisWeek.push({
      type: 'serving_slot',
      id: s.id,
      title: s.title || s.title_ar || '',
      subtitle: s.serving_areas?.name || s.serving_areas?.name_ar || '',
      datetime: s.date,
      href: '/serving',
    })
  }

  upcomingThisWeek.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())

  // Process group health (scoped)
  const groups = (groupsRes.data || []) as unknown as GroupWithHealthRow[]
  const groupHealth: GroupHealthRow[] = []

  let groupAttendanceMap = new Map<string, { present: number; total: number }>()
  if (groupIds.length > 0) {
    const { data: groupAttendance } = await supabase
      .from('attendance')
      .select('group_id, status, gatherings!inner(status, scheduled_at)')
      .eq('church_id', churchId)
      .in('group_id', groupIds)
      .gte('gatherings.scheduled_at', weeksAgo(4))

    for (const rec of (groupAttendance || []) as unknown as AttendanceWithGatheringRow[]) {
      if (rec.gatherings?.status !== 'completed' || !rec.group_id) continue
      if (!groupAttendanceMap.has(rec.group_id)) {
        groupAttendanceMap.set(rec.group_id, { present: 0, total: 0 })
      }
      const entry = groupAttendanceMap.get(rec.group_id)!
      entry.total++
      if (rec.status === 'present' || rec.status === 'late') entry.present++
    }
  }

  let prevGroupAttendanceMap = new Map<string, number>()
  if (groupIds.length > 0) {
    const { data: prevAttendance } = await supabase
      .from('attendance')
      .select('group_id, status, gatherings!inner(status, scheduled_at)')
      .eq('church_id', churchId)
      .in('group_id', groupIds)
      .gte('gatherings.scheduled_at', weeksAgo(8))
      .lte('gatherings.scheduled_at', weeksAgo(4))

    const prevMap = new Map<string, { present: number; total: number }>()
    for (const rec of (prevAttendance || []) as unknown as AttendanceWithGatheringRow[]) {
      if (rec.gatherings?.status !== 'completed' || !rec.group_id) continue
      if (!prevMap.has(rec.group_id)) prevMap.set(rec.group_id, { present: 0, total: 0 })
      const entry = prevMap.get(rec.group_id)!
      entry.total++
      if (rec.status === 'present' || rec.status === 'late') entry.present++
    }
    for (const [gId, data] of prevMap) {
      prevGroupAttendanceMap.set(gId, data.total > 0 ? (data.present / data.total) * 100 : 0)
    }
  }

  for (const g of groups) {
    const leader = g.profiles
    const activeGroupMembers = (g.group_members || []).filter((m) => m.is_active)
    const atRiskCount = activeGroupMembers.filter((m) => m.profiles?.status === 'at_risk').length
    const attData = groupAttendanceMap.get(g.id)
    const currentRate = attData && attData.total > 0 ? Math.round((attData.present / attData.total) * 100) : null
    const prevRate = prevGroupAttendanceMap.get(g.id) ?? null

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (currentRate !== null && prevRate !== null) {
      if (currentRate > prevRate + 5) trend = 'up'
      else if (currentRate < prevRate - 5) trend = 'down'
    }

    groupHealth.push({
      id: g.id,
      name: g.name,
      nameAr: g.name_ar,
      leaderName: leader ? `${leader.first_name || ''} ${leader.last_name || ''}`.trim() : '',
      leaderNameAr: leader ? `${leader.first_name_ar || ''} ${leader.last_name_ar || ''}`.trim() || null : null,
      memberCount: activeGroupMembers.length,
      attendanceRate: currentRate,
      atRiskCount,
      trend,
    })
  }

  return {
    kpis: {
      activeMembers: { value: activeMembers, trend: 0 },
      newVisitors: { value: visitorsThisWeekRes.count || 0, slaAlert: slaBreachedRes.count || 0 },
      attendanceRate: { value: attendanceRate },
      upcomingEvents: { value: upcomingEventsRes.count || 0 },
    },
    attendanceTrend,
    visitorPipeline,
    attentionItems: attentionItems.slice(0, 10),
    upcomingThisWeek: upcomingThisWeek.slice(0, 8),
    groupHealth,
  }
}
