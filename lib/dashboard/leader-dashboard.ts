import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  LeaderDashboardData,
  WeeklyAttendancePoint,
  AtRiskMember,
  RecentPrayer,
} from '@/types/dashboard'
import {
  weeksAgo,
  getWeekNumber,
  formatWeekLabel,
  getCoLedMinistryGroupIds,
} from './shared-queries'

// ─── Leader Dashboard ─────────────────────────────

export async function fetchLeaderDashboard(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string
): Promise<LeaderDashboardData> {
  // Get groups where user is direct leader/co-leader
  const { data: leaderGroups } = await supabase
    .from('groups')
    .select('id, name, name_ar')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .or(`leader_id.eq.${profileId},co_leader_id.eq.${profileId}`)

  // Also include groups from ministries where user is co_leader
  const coLedGroupIds = await getCoLedMinistryGroupIds(supabase, profileId, churchId)
  const directGroupIds = new Set((leaderGroups || []).map(g => g.id))
  const additionalGroupIds = coLedGroupIds.filter(id => !directGroupIds.has(id))

  let additionalGroups: { id: string; name: string; name_ar: string }[] = []
  if (additionalGroupIds.length > 0) {
    const { data } = await supabase
      .from('groups')
      .select('id, name, name_ar')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .in('id', additionalGroupIds)
    additionalGroups = (data || []) as any[]
  }

  const groups = [...(leaderGroups || []), ...additionalGroups]
  const groupIds = groups.map(g => g.id)

  if (groupIds.length === 0) {
    return {
      groups: [],
      atRiskMembers: [],
      recentPrayers: [],
      assignedVisitorCount: 0,
      attendanceTrend: [],
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

  // Attendance per group (last 12 weeks for trend, last 4 weeks for rate)
  const { data: groupAttendance } = await supabase
    .from('attendance')
    .select('group_id, status, gatherings!inner(status, scheduled_at)')
    .eq('church_id', churchId)
    .in('group_id', groupIds)
    .gte('gatherings.scheduled_at', weeksAgo(12))

  const fourWeeksAgoStr = weeksAgo(4)
  const groupRateMap = new Map<string, { present: number; total: number }>()
  const weeklyTrendMap = new Map<number, { present: number; total: number; date: Date }>()
  for (const rec of (groupAttendance || []) as any[]) {
    if (rec.gatherings?.status !== 'completed') continue
    // Weekly trend (all 12 weeks)
    const date = new Date(rec.gatherings.scheduled_at)
    const weekNum = getWeekNumber(date)
    if (!weeklyTrendMap.has(weekNum)) weeklyTrendMap.set(weekNum, { present: 0, total: 0, date })
    const weekEntry = weeklyTrendMap.get(weekNum)!
    weekEntry.total++
    if (rec.status === 'present' || rec.status === 'late') weekEntry.present++
    // Per-group rate (last 4 weeks only)
    if (rec.gatherings.scheduled_at >= fourWeeksAgoStr) {
      if (!groupRateMap.has(rec.group_id)) groupRateMap.set(rec.group_id, { present: 0, total: 0 })
      const entry = groupRateMap.get(rec.group_id)!
      entry.total++
      if (rec.status === 'present' || rec.status === 'late') entry.present++
    }
  }

  const attendanceTrend: WeeklyAttendancePoint[] = Array.from(weeklyTrendMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, data]) => ({
      weekLabel: formatWeekLabel(data.date),
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }))

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

  // Process at-risk members — batch fetch last attendance for all at once
  const seenIds = new Set<string>()
  const uniqueAtRisk: any[] = []
  for (const m of (atRiskRes.data || []) as any[]) {
    const p = m.profiles
    if (!p || seenIds.has(p.id)) continue
    seenIds.add(p.id)
    uniqueAtRisk.push(p)
  }

  // Fetch last attendance for all at-risk members in parallel
  const lastAttResults = await Promise.all(
    uniqueAtRisk.map(p =>
      supabase
        .from('attendance')
        .select('marked_at, gatherings!inner(scheduled_at)')
        .eq('profile_id', p.id)
        .in('status', ['present', 'late'])
        .order('marked_at', { ascending: false })
        .limit(1)
    )
  )

  const atRiskMembers: AtRiskMember[] = uniqueAtRisk.map((p, i) => {
    const row = lastAttResults[i].data?.[0] as any
    const lastSeen = row?.gatherings?.scheduled_at || null
    const daysAbsent = lastSeen
      ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    return {
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      nameAr: `${p.first_name_ar || ''} ${p.last_name_ar || ''}`.trim() || null,
      photoUrl: p.photo_url,
      lastSeen,
      daysAbsent,
    }
  })

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
    attendanceTrend,
    recentGatherings,
  }
}
