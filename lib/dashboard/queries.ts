import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminDashboardData,
  LeaderDashboardData,
  MemberDashboardData,
  WeeklyAttendancePoint,
  VisitorPipelineItem,
  AttentionItem,
  UpcomingItem,
  GroupHealthRow,
  AtRiskMember,
  RecentPrayer,
} from '@/types/dashboard'

// ─── Helpers ──────────────────────────────────────

function startOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function weeksAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() + (6 - d.getDay()))
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
}

function formatWeekLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
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
  const attendanceRecords = (attendanceRateRes.data || []) as any[]
  const completedAttendance = attendanceRecords.filter((a: any) => a.gatherings?.status === 'completed')
  const presentCount = completedAttendance.filter((a: any) => a.status === 'present' || a.status === 'late').length
  const attendanceRate = completedAttendance.length > 0
    ? Math.round((presentCount / completedAttendance.length) * 100)
    : 0

  // Process attendance trend
  const trendRecords = (attendanceTrendRes.data || []) as any[]
  const completedTrend = trendRecords.filter((a: any) => a.gatherings?.status === 'completed')
  const weeklyMap = new Map<number, { present: number; total: number; date: Date }>()

  for (const rec of completedTrend) {
    const date = new Date(rec.gatherings.scheduled_at)
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
  const visitors = (visitorPipelineRes.data || []) as any[]
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

  for (const v of (slaVisitorsRes.data || []) as any[]) {
    attentionItems.push({
      type: 'visitor_sla',
      id: v.id,
      label: `${v.first_name} ${v.last_name}`,
      sublabel: 'SLA overdue',
      href: `/admin/visitors`,
    })
  }

  for (const m of (atRiskRes.data || []) as any[]) {
    attentionItems.push({
      type: 'at_risk_member',
      id: m.id,
      label: `${m.first_name || ''} ${m.last_name || ''}`.trim() || `${m.first_name_ar || ''} ${m.last_name_ar || ''}`.trim(),
      sublabel: 'At risk',
      href: `/admin/members/${m.id}`,
    })
  }

  for (const slot of (unfilledSlotsRes.data || []) as any[]) {
    const activeSignups = (slot.serving_signups || []).filter((s: any) => s.status !== 'cancelled').length
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

  for (const g of (upcomingGatheringsRes.data || []) as any[]) {
    upcomingThisWeek.push({
      type: 'gathering',
      id: g.id,
      title: g.groups?.name || g.groups?.name_ar || '',
      subtitle: g.topic || g.topic_ar || '',
      datetime: g.scheduled_at,
      href: `/groups/${g.groups?.id}/gathering/${g.id}`,
    })
  }

  for (const e of (upcomingEventsListRes.data || []) as any[]) {
    upcomingThisWeek.push({
      type: 'event',
      id: e.id,
      title: e.title || e.title_ar || '',
      subtitle: '',
      datetime: e.starts_at,
      href: `/events/${e.id}`,
    })
  }

  for (const s of (upcomingSlotsRes.data || []) as any[]) {
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
  const groups = (groupsRes.data || []) as any[]
  const groupHealth: GroupHealthRow[] = []

  // Fetch attendance data per group for last 4 weeks
  const groupIds = groups.map((g: any) => g.id)
  let groupAttendanceMap = new Map<string, { present: number; total: number }>()

  if (groupIds.length > 0) {
    const { data: groupAttendance } = await supabase
      .from('attendance')
      .select('group_id, status, gatherings!inner(status, scheduled_at)')
      .eq('church_id', churchId)
      .in('group_id', groupIds)
      .gte('gatherings.scheduled_at', weeksAgo(4))

    for (const rec of (groupAttendance || []) as any[]) {
      if (rec.gatherings?.status !== 'completed') continue
      if (!groupAttendanceMap.has(rec.group_id)) {
        groupAttendanceMap.set(rec.group_id, { present: 0, total: 0 })
      }
      const entry = groupAttendanceMap.get(rec.group_id)!
      entry.total++
      if (rec.status === 'present' || rec.status === 'late') entry.present++
    }
  }

  // Also get previous 4 weeks for trend comparison
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
    for (const rec of (prevAttendance || []) as any[]) {
      if (rec.gatherings?.status !== 'completed') continue
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
    const leader = g.profiles as any
    const activeMembers = (g.group_members || []).filter((m: any) => m.is_active)
    const atRiskCount = activeMembers.filter((m: any) => m.profiles?.status === 'at_risk').length
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

// ─── Leader Dashboard ─────────────────────────────

export async function fetchLeaderDashboard(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string
): Promise<LeaderDashboardData> {
  // Get leader's groups
  const { data: leaderGroups } = await supabase
    .from('groups')
    .select('id, name, name_ar')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .or(`leader_id.eq.${profileId},co_leader_id.eq.${profileId}`)

  const groups = leaderGroups || []
  const groupIds = groups.map(g => g.id)

  if (groupIds.length === 0) {
    return {
      groups: [],
      atRiskMembers: [],
      recentPrayers: [],
      assignedVisitorCount: 0,
      recentGatherings: [],
    }
  }

  const [
    memberCountsRes,
    nextGatheringsRes,
    atRiskRes,
    prayersRes,
    visitorsRes,
    recentGatheringsRes,
  ] = await Promise.all([
    // Member counts per group
    supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('is_active', true),

    // Next gathering per group
    supabase
      .from('gatherings')
      .select('id, group_id, scheduled_at, topic')
      .in('group_id', groupIds)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true }),

    // At-risk members from leader's groups
    supabase
      .from('group_members')
      .select('profiles!inner(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, status)')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .eq('profiles.status', 'at_risk'),

    // Active prayers
    supabase
      .from('prayer_requests')
      .select('id, content, is_private, status, created_at, submitted_by, profiles!prayer_requests_submitted_by_fkey(first_name, last_name, first_name_ar, last_name_ar)')
      .in('group_id', groupIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),

    // Assigned visitors
    supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('assigned_to', profileId)
      .in('status', ['new', 'assigned']),

    // Recent gatherings
    supabase
      .from('gatherings')
      .select('id, group_id, scheduled_at, topic, status, groups!inner(name, name_ar), attendance(id, status)')
      .in('group_id', groupIds)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(4),
  ])

  // Process member counts
  const memberCounts = new Map<string, number>()
  for (const m of (memberCountsRes.data || []) as any[]) {
    memberCounts.set(m.group_id, (memberCounts.get(m.group_id) || 0) + 1)
  }

  // Attendance per group (last 4 weeks)
  const { data: groupAttendance } = await supabase
    .from('attendance')
    .select('group_id, status, gatherings!inner(status, scheduled_at)')
    .eq('church_id', churchId)
    .in('group_id', groupIds)
    .gte('gatherings.scheduled_at', weeksAgo(4))

  const groupRateMap = new Map<string, { present: number; total: number }>()
  for (const rec of (groupAttendance || []) as any[]) {
    if (rec.gatherings?.status !== 'completed') continue
    if (!groupRateMap.has(rec.group_id)) groupRateMap.set(rec.group_id, { present: 0, total: 0 })
    const entry = groupRateMap.get(rec.group_id)!
    entry.total++
    if (rec.status === 'present' || rec.status === 'late') entry.present++
  }

  // Prayer counts per group
  const { data: prayerCounts } = await supabase
    .from('prayer_requests')
    .select('group_id')
    .in('group_id', groupIds)
    .eq('status', 'active')

  const prayerCountMap = new Map<string, number>()
  for (const p of (prayerCounts || []) as any[]) {
    prayerCountMap.set(p.group_id, (prayerCountMap.get(p.group_id) || 0) + 1)
  }

  // Build next gathering map (first upcoming per group)
  const nextGatheringMap = new Map<string, any>()
  for (const g of (nextGatheringsRes.data || []) as any[]) {
    if (!nextGatheringMap.has(g.group_id)) {
      nextGatheringMap.set(g.group_id, g)
    }
  }

  // Build group summaries
  const groupSummaries = groups.map(g => {
    const attData = groupRateMap.get(g.id)
    const next = nextGatheringMap.get(g.id)
    return {
      id: g.id,
      name: g.name,
      nameAr: g.name_ar,
      memberCount: memberCounts.get(g.id) || 0,
      attendanceRate: attData && attData.total > 0
        ? Math.round((attData.present / attData.total) * 100)
        : null,
      activePrayerCount: prayerCountMap.get(g.id) || 0,
      nextGathering: next ? { id: next.id, scheduledAt: next.scheduled_at, topic: next.topic } : null,
    }
  })

  // Process at-risk members
  const seenIds = new Set<string>()
  const atRiskMembers: AtRiskMember[] = []
  for (const m of (atRiskRes.data || []) as any[]) {
    const p = m.profiles
    if (!p || seenIds.has(p.id)) continue
    seenIds.add(p.id)

    // Get last attendance for this member
    const { data: lastAtt } = await supabase
      .from('attendance')
      .select('marked_at, gatherings!inner(scheduled_at)')
      .eq('profile_id', p.id)
      .in('status', ['present', 'late'])
      .order('marked_at', { ascending: false })
      .limit(1)

    const row = lastAtt?.[0] as any
    const lastSeen = row?.gatherings?.scheduled_at || null
    const daysAbsent = lastSeen
      ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    atRiskMembers.push({
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      nameAr: `${p.first_name_ar || ''} ${p.last_name_ar || ''}`.trim() || null,
      photoUrl: p.photo_url,
      lastSeen,
      daysAbsent,
    })
  }

  // Process prayers
  const recentPrayers: RecentPrayer[] = ((prayersRes.data || []) as any[]).map(p => ({
    id: p.id,
    content: p.content,
    isPrivate: p.is_private,
    submitterName: `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim(),
    submitterNameAr: `${p.profiles?.first_name_ar || ''} ${p.profiles?.last_name_ar || ''}`.trim() || null,
    createdAt: p.created_at,
    status: p.status,
  }))

  // Process recent gatherings
  const recentGatherings = ((recentGatheringsRes.data || []) as any[]).map(g => {
    const att = (g.attendance || []) as any[]
    return {
      id: g.id,
      groupId: g.group_id,
      groupName: g.groups?.name || '',
      groupNameAr: g.groups?.name_ar || null,
      scheduledAt: g.scheduled_at,
      topic: g.topic,
      status: g.status,
      presentCount: att.filter((a: any) => a.status === 'present' || a.status === 'late').length,
      totalCount: att.length,
    }
  })

  return {
    groups: groupSummaries,
    atRiskMembers: atRiskMembers.slice(0, 5),
    recentPrayers,
    assignedVisitorCount: visitorsRes.count || 0,
    recentGatherings,
  }
}

// ─── Member Dashboard ─────────────────────────────

export async function fetchMemberDashboard(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string
): Promise<MemberDashboardData> {
  const now = new Date()

  const [
    attendanceRes,
    milestonesRes,
    myGroupsRes,
    unreadRes,
    upcomingEventsRes,
    myRegistrationsRes,
    servingSignupsRes,
    announcementsRes,
  ] = await Promise.all([
    // Personal attendance
    supabase
      .from('attendance')
      .select('status, gatherings!inner(status)')
      .eq('profile_id', profileId)
      .eq('church_id', churchId),

    // Milestones
    supabase
      .from('profile_milestones')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId),

    // My groups with leader + next gathering
    supabase
      .from('group_members')
      .select('groups!inner(id, name, name_ar, leader_id, profiles!groups_leader_id_fkey(first_name, last_name, first_name_ar, last_name_ar))')
      .eq('profile_id', profileId)
      .eq('is_active', true),

    // Unread notifications
    supabase
      .from('notifications_log')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('channel', 'in_app')
      .is('read_at', null),

    // Upcoming events
    supabase
      .from('events')
      .select('id, title, title_ar, starts_at')
      .eq('church_id', churchId)
      .eq('status', 'published')
      .gte('starts_at', now.toISOString())
      .order('starts_at', { ascending: true })
      .limit(3),

    // My event registrations
    supabase
      .from('event_registrations')
      .select('event_id')
      .eq('profile_id', profileId)
      .in('status', ['registered', 'confirmed']),

    // My serving signups
    supabase
      .from('serving_signups')
      .select('serving_slots!inner(id, title, title_ar, date, serving_areas(name, name_ar))')
      .eq('profile_id', profileId)
      .neq('status', 'cancelled')
      .gte('serving_slots.date', now.toISOString().split('T')[0])
      .order('serving_slots.date' as any, { ascending: true })
      .limit(3),

    // Recent announcements
    supabase
      .from('announcements')
      .select('id, title, title_ar, body, body_ar, published_at, is_pinned')
      .eq('church_id', churchId)
      .eq('status', 'published')
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(3),
  ])

  // Process attendance rate
  const completedAtt = ((attendanceRes.data || []) as any[]).filter(
    (a: any) => a.gatherings?.status === 'completed'
  )
  const presentAtt = completedAtt.filter((a: any) => a.status === 'present' || a.status === 'late')
  const attendanceRate = completedAtt.length > 0
    ? Math.round((presentAtt.length / completedAtt.length) * 100)
    : null

  // Process my groups
  const myGroupIds = ((myGroupsRes.data || []) as any[]).map((m: any) => m.groups?.id).filter(Boolean)

  // Get next gathering per group
  let nextGatheringMap = new Map<string, string>()
  if (myGroupIds.length > 0) {
    const { data: nextGatherings } = await supabase
      .from('gatherings')
      .select('group_id, scheduled_at')
      .in('group_id', myGroupIds)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })

    for (const g of (nextGatherings || []) as any[]) {
      if (!nextGatheringMap.has(g.group_id)) {
        nextGatheringMap.set(g.group_id, g.scheduled_at)
      }
    }
  }

  const myGroups = ((myGroupsRes.data || []) as any[])
    .map((m: any) => {
      const g = m.groups
      if (!g) return null
      const leader = g.profiles
      return {
        id: g.id,
        name: g.name,
        nameAr: g.name_ar,
        leaderName: leader ? `${leader.first_name || ''} ${leader.last_name || ''}`.trim() : '',
        leaderNameAr: leader ? `${leader.first_name_ar || ''} ${leader.last_name_ar || ''}`.trim() || null : null,
        nextGathering: nextGatheringMap.get(g.id) || null,
      }
    })
    .filter(Boolean) as MemberDashboardData['myGroups']

  // Process registrations
  const registeredEventIds = new Set(
    ((myRegistrationsRes.data || []) as any[]).map((r: any) => r.event_id)
  )

  const upcomingEvents = ((upcomingEventsRes.data || []) as any[]).map((e: any) => ({
    id: e.id,
    title: e.title,
    titleAr: e.title_ar,
    startsAt: e.starts_at,
    isRegistered: registeredEventIds.has(e.id),
  }))

  // Process serving signups
  const servingSlots = ((servingSignupsRes.data || []) as any[]).map((s: any) => ({
    id: s.serving_slots?.id || '',
    title: s.serving_slots?.title || '',
    titleAr: s.serving_slots?.title_ar || null,
    date: s.serving_slots?.date || '',
    areaName: s.serving_slots?.serving_areas?.name || '',
    areaNameAr: s.serving_slots?.serving_areas?.name_ar || null,
  }))

  // Process announcements
  const recentAnnouncements = ((announcementsRes.data || []) as any[]).map((a: any) => ({
    id: a.id,
    title: a.title,
    titleAr: a.title_ar,
    body: a.body,
    bodyAr: a.body_ar,
    publishedAt: a.published_at,
    isPinned: a.is_pinned,
  }))

  return {
    kpis: {
      attendanceRate,
      milestoneCount: milestonesRes.count || 0,
      groupCount: myGroupIds.length,
      unreadNotifications: unreadRes.count || 0,
    },
    myGroups,
    upcomingEvents,
    servingSlots,
    recentAnnouncements,
  }
}
