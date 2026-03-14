import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MinistryLeaderDashboardData,
  WeeklyAttendancePoint,
  AttentionItem,
  GroupHealthRow,
} from '@/types/dashboard'
import {
  weeksAgo,
  getWeekNumber,
  formatWeekLabel,
} from './shared-queries'

// ─── Row shapes for Supabase join queries (no Database generic) ───

interface MinistryMemberRow {
  ministry_id: string
  ministries?: { name: string; name_ar: string | null } | null
}

interface LegacyMinistryRow {
  id: string
  name: string
  name_ar: string | null
}

interface GroupIdRow {
  id: string
}

interface AttendanceWithGatheringRow {
  status: string
  gatherings?: { scheduled_at: string; status: string } | null
}

interface EventServiceNeedRow {
  events?: { id: string; title: string; title_ar: string | null; starts_at: string; status: string } | null
}

interface ServiceAssignmentRow {
  event_service_needs?: {
    notes: string | null
    notes_ar: string | null
    events?: { title: string; title_ar: string | null; starts_at: string } | null
  } | null
}

interface AtRiskGroupMemberRow {
  profiles?: {
    id: string; first_name: string | null; last_name: string | null
    first_name_ar: string | null; last_name_ar: string | null
  } | null
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

// ─── Dedicated Ministry Leader Dashboard ─────────

export async function fetchMinistryLeaderDashboardV2(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string
): Promise<MinistryLeaderDashboardData> {
  const now = new Date()

  // Find ministries this user leads
  const { data: myMinistries } = await supabase
    .from('ministry_members')
    .select('ministry_id, ministries!inner(name, name_ar)')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .eq('role_in_ministry', 'leader')

  const { data: legacyMinistries } = await supabase
    .from('ministries')
    .select('id, name, name_ar')
    .eq('church_id', churchId)
    .eq('leader_id', profileId)

  const allMinistries = [
    ...((myMinistries || []) as unknown as MinistryMemberRow[]).map((m) => ({ id: m.ministry_id, name: m.ministries?.name, nameAr: m.ministries?.name_ar })),
    ...((legacyMinistries || []) as LegacyMinistryRow[]).map((m) => ({ id: m.id, name: m.name, nameAr: m.name_ar })),
  ]
  const uniqueMinistries = Array.from(new Map(allMinistries.map(m => [m.id, m])).values())
  const ministryIds = uniqueMinistries.map(m => m.id)

  const primaryMinistry = uniqueMinistries[0]

  // Get groups under ministries
  let groupIds: string[] = []
  if (ministryIds.length > 0) {
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .in('ministry_id', ministryIds)
    groupIds = ((groups || []) as GroupIdRow[]).map((g) => g.id)
  }

  const emptyResult: MinistryLeaderDashboardData = {
    ministryName: primaryMinistry?.name || '',
    ministryNameAr: primaryMinistry?.nameAr || null,
    memberCount: 0,
    groupCount: groupIds.length,
    attendanceRate: 0,
    attendanceTrend: [],
    upcomingEvents: [],
    serviceAssignments: [],
    attentionItems: [],
    groupHealth: [],
  }

  if (groupIds.length === 0 && ministryIds.length === 0) return emptyResult

  // Parallel queries
  const [
    memberCountRes,
    attendanceRes,
    eventsRes,
    assignmentsRes,
    atRiskRes,
    groupsRes,
  ] = await Promise.all([
    // Ministry member count
    ministryIds.length > 0
      ? supabase.from('ministry_members').select('id', { count: 'exact', head: true }).in('ministry_id', ministryIds).eq('is_active', true)
      : Promise.resolve({ count: 0 }),
    // Attendance trend (12 weeks)
    groupIds.length > 0
      ? supabase.from('attendance').select('status, gatherings!inner(scheduled_at, status)').eq('church_id', churchId).in('group_id', groupIds).gte('gatherings.scheduled_at', weeksAgo(12))
      : Promise.resolve({ data: [] }),
    // Upcoming events involving ministry
    ministryIds.length > 0
      ? supabase.from('event_service_needs').select('events!inner(id, title, title_ar, starts_at, status)').in('ministry_id', ministryIds).eq('events.status', 'published').gte('events.starts_at', now.toISOString()).limit(5)
      : Promise.resolve({ data: [] }),
    // Service assignments for this user
    supabase.from('event_service_assignments').select('event_service_needs!inner(notes, notes_ar, events!inner(title, title_ar, starts_at))').eq('profile_id', profileId).eq('status', 'accepted').limit(5),
    // At-risk members in groups
    groupIds.length > 0
      ? supabase.from('group_members').select('profiles!inner(id, first_name, last_name, first_name_ar, last_name_ar)').in('group_id', groupIds).eq('is_active', true).eq('profiles.status', 'at_risk').limit(5)
      : Promise.resolve({ data: [] }),
    // Group health
    groupIds.length > 0
      ? supabase.from('groups').select('id, name, name_ar, leader_id, profiles!groups_leader_id_fkey(first_name, last_name, first_name_ar, last_name_ar), group_members(id, is_active, profiles(status))').eq('church_id', churchId).eq('is_active', true).in('id', groupIds)
      : Promise.resolve({ data: [] }),
  ])

  // Attendance trend
  const trendRecords = ((attendanceRes as { data: AttendanceWithGatheringRow[] | null }).data || [])
  const completedTrend = trendRecords.filter((a) => a.gatherings?.status === 'completed')
  const weekMap = new Map<number, { present: number; total: number; date: Date }>()
  let totalPresent = 0, totalAll = 0
  for (const rec of completedTrend) {
    const date = new Date(rec.gatherings!.scheduled_at)
    const wn = getWeekNumber(date)
    if (!weekMap.has(wn)) weekMap.set(wn, { present: 0, total: 0, date })
    const w = weekMap.get(wn)!
    w.total++; totalAll++
    if (rec.status === 'present' || rec.status === 'late') { w.present++; totalPresent++ }
  }
  const attendanceTrend: WeeklyAttendancePoint[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, d]) => ({ weekLabel: formatWeekLabel(d.date), rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0 }))

  // Events
  const seenEventIds = new Set<string>()
  const upcomingEvents = (((eventsRes as { data: EventServiceNeedRow[] | null }).data || []))
    .map((n) => n.events)
    .filter((e): e is NonNullable<EventServiceNeedRow['events']> => { if (!e || seenEventIds.has(e.id)) return false; seenEventIds.add(e.id); return true })
    .map((e) => ({ id: e.id, title: e.title, titleAr: e.title_ar, startsAt: e.starts_at }))

  // Assignments
  const serviceAssignments = ((assignmentsRes.data || []) as unknown as ServiceAssignmentRow[]).map((a) => ({
    eventTitle: a.event_service_needs?.events?.title || '',
    eventTitleAr: a.event_service_needs?.events?.title_ar || null,
    role: a.event_service_needs?.notes || '',
    roleAr: a.event_service_needs?.notes_ar || null,
    startsAt: a.event_service_needs?.events?.starts_at || '',
  }))

  // Attention
  const attentionItems: AttentionItem[] = []
  const seenIds = new Set<string>()
  for (const m of ((atRiskRes as { data: AtRiskGroupMemberRow[] | null }).data || [])) {
    const p = m.profiles
    if (!p || seenIds.has(p.id)) continue
    seenIds.add(p.id)
    attentionItems.push({
      type: 'at_risk_member',
      id: p.id,
      label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `${p.first_name_ar || ''} ${p.last_name_ar || ''}`.trim(),
      sublabel: 'At risk',
      href: `/admin/members/${p.id}`,
    })
  }

  // Group health
  const groups = ((groupsRes as { data: GroupWithHealthRow[] | null }).data || [])
  const groupHealth: GroupHealthRow[] = groups.map((g) => {
    const leader = g.profiles
    const activeMembers = (g.group_members || []).filter((m) => m.is_active)
    const atRiskCount = activeMembers.filter((m) => m.profiles?.status === 'at_risk').length
    return {
      id: g.id,
      name: g.name,
      nameAr: g.name_ar,
      leaderName: leader ? `${leader.first_name || ''} ${leader.last_name || ''}`.trim() : '',
      leaderNameAr: leader ? `${leader.first_name_ar || ''} ${leader.last_name_ar || ''}`.trim() || null : null,
      memberCount: activeMembers.length,
      attendanceRate: null,
      atRiskCount,
      trend: 'stable' as const,
    }
  })

  return {
    ministryName: primaryMinistry?.name || '',
    ministryNameAr: primaryMinistry?.nameAr || null,
    memberCount: (memberCountRes as { count: number | null }).count || 0,
    groupCount: groupIds.length,
    attendanceRate: totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0,
    attendanceTrend,
    upcomingEvents,
    serviceAssignments,
    attentionItems,
    groupHealth,
  }
}
