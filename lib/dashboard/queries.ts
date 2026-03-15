import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  AdminDashboardData,
  LeaderDashboardData,
  MemberDashboardData,
  MinistryLeaderDashboardData,
  WeeklyAttendancePoint,
  VisitorPipelineItem,
  AttentionItem,
  UpcomingItem,
  GroupHealthRow,
  AtRiskMember,
  RecentPrayer,
} from '@/types/dashboard'

// ─── Cached Dashboard Wrappers (300s TTL) ─────────────────────────
// These wrap the raw fetch functions with unstable_cache so dashboard
// queries don't hit the database on every page load.
// IMPORTANT: Supabase client is created INSIDE each cached function
// because unstable_cache serializes the closure and the client uses
// cookies for auth which can't be serialized.

export const getCachedAdminDashboard = (churchId: string, profileId: string, slaHours: number = 48) =>
  unstable_cache(
    async () => {
      const supabase = await createClient()
      return fetchAdminDashboard(supabase, profileId, churchId, slaHours)
    },
    [`admin-dashboard-${churchId}`],
    { tags: [`dashboard-${churchId}`], revalidate: 300 }
  )()

export const getCachedMinistryLeaderDashboard = (churchId: string, profileId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createClient()
      return fetchMinistryLeaderDashboardV2(supabase, profileId, churchId)
    },
    [`ministry-leader-dashboard-${churchId}-${profileId}`],
    { tags: [`dashboard-${churchId}`], revalidate: 300 }
  )()

export const getCachedLeaderDashboard = (churchId: string, profileId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createClient()
      return fetchLeaderDashboard(supabase, profileId, churchId)
    },
    [`leader-dashboard-${churchId}-${profileId}`],
    { tags: [`dashboard-${churchId}`], revalidate: 300 }
  )()

export const getCachedMemberDashboard = (churchId: string, profileId: string) =>
  unstable_cache(
    async () => {
      const supabase = await createClient()
      return fetchMemberDashboard(supabase, profileId, churchId)
    },
    [`member-dashboard-${churchId}-${profileId}`],
    { tags: [`dashboard-${churchId}`], revalidate: 300 }
  )()

// ─── Shared DB record interfaces ─────────────────
// These mirror the shape of Supabase joined query results
// to avoid `any` casts on query data.

interface AttendanceRecord {
  status: string
  group_id: string
  gatherings?: { status: string; scheduled_at: string } | null
}

interface VisitorRecord {
  id: string
  status: string
  first_name: string
  last_name: string
}

interface ProfileRecord {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  status?: string
  phone?: string | null
  photo_url?: string | null
}

interface SlotRecord {
  id: string
  title: string | null
  title_ar: string | null
  date: string
  max_volunteers: number | null
  signup_count?: number
  serving_signups?: Array<{ status: string }> | null
  serving_areas?: { name: string | null; name_ar: string | null } | null
}

interface GatheringRecord {
  id: string
  scheduled_at: string
  topic: string | null
  topic_ar: string | null
  groups?: { id: string; name: string | null; name_ar: string | null } | null
}

interface EventRecord {
  id: string
  title: string | null
  title_ar: string | null
  starts_at: string
  ends_at?: string | null
}

interface GroupRecord {
  id: string
  name: string
  name_ar: string | null
  leader_id?: string | null
  profiles?: ProfileRecord | null
  group_members?: Array<{ id?: string; is_active: boolean; profiles?: { status: string } | null }> | null
}

interface MinistryMemberRecord {
  ministry_id: string
  ministries?: { name: string; name_ar: string | null } | null
}

interface GroupMemberRecord {
  groups?: { id: string; name?: string; name_ar?: string | null } | null
  group_id?: string
}

interface ServiceAssignmentRecord {
  id: string
  status: string
  role: string | null
  role_ar: string | null
  events?: EventRecord | null
}

interface EventRegistrationRecord {
  event_id: string
}

interface ServingSignupRecord {
  id: string
  status: string
  serving_slots?: { id: string; title: string | null; title_ar: string | null; date: string; serving_areas?: { name: string | null; name_ar: string | null } | null } | null
}

interface AnnouncementRecord {
  id: string
  title: string | null
  title_ar: string | null
  body: string | null
  body_ar: string | null
  published_at: string | null
}

interface PrayerRecord {
  id: string
  content: string
  is_private: boolean
  is_anonymous: boolean
  status: string
  created_at: string
  submitted_by?: string
  profiles?: { first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null } | null
}

interface GatheringWithAttendance {
  id: string
  group_id: string
  scheduled_at: string
  topic: string | null
  topic_ar?: string | null
  status: string
  groups?: { name: string | null; name_ar: string | null } | null
  attendance?: Array<{ status: string }> | null
}

interface MemberCountRecord {
  group_id: string
  profile_id: string
}

interface PrayerCountRecord {
  group_id: string
}

interface NextGatheringRecord {
  id: string
  group_id: string
  scheduled_at: string
  topic: string | null
  groups?: { id: string; name: string | null; name_ar: string | null } | null
}

interface LastAttendanceRecord {
  profile_id: string
  marked_at: string | null
  gatherings?: { scheduled_at: string } | null
}

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
  const attendanceRecords = (attendanceRateRes.data || []) as unknown as AttendanceRecord[]
  const completedAttendance = attendanceRecords.filter((a) => a.gatherings?.status === 'completed')
  const presentCount = completedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const attendanceRate = completedAttendance.length > 0
    ? Math.round((presentCount / completedAttendance.length) * 100)
    : 0

  // Process attendance trend
  const trendRecords = (attendanceTrendRes.data || []) as unknown as AttendanceRecord[]
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
  const visitors = (visitorPipelineRes.data || []) as unknown as VisitorRecord[]
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

  for (const v of (slaVisitorsRes.data || []) as unknown as VisitorRecord[]) {
    attentionItems.push({
      type: 'visitor_sla',
      id: v.id,
      label: `${v.first_name} ${v.last_name}`,
      sublabel: 'SLA overdue',
      href: `/admin/visitors`,
    })
  }

  for (const m of (atRiskRes.data || []) as unknown as ProfileRecord[]) {
    attentionItems.push({
      type: 'at_risk_member',
      id: m.id,
      label: `${m.first_name || ''} ${m.last_name || ''}`.trim() || `${m.first_name_ar || ''} ${m.last_name_ar || ''}`.trim(),
      sublabel: 'At risk',
      href: `/admin/members/${m.id}`,
    })
  }

  for (const slot of (unfilledSlotsRes.data || []) as unknown as SlotRecord[]) {
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

  // Church-wide prayer requests + outreach follow-ups (parallel)
  const [{ count: activePrayerCount }, { count: followupCount }] = await Promise.all([
    supabase
      .from('prayer_requests')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .is('group_id', null)
      .eq('status', 'active'),
    supabase
      .from('outreach_visits')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('needs_followup', true),
  ])

  if (activePrayerCount && activePrayerCount > 0) {
    attentionItems.push({
      type: 'active_prayer',
      id: 'prayers',
      label: `${activePrayerCount} active prayer requests`,
      sublabel: 'Church-wide prayers',
      href: '/admin/prayers',
    })
  }

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

  for (const g of (upcomingGatheringsRes.data || []) as unknown as GatheringRecord[]) {
    upcomingThisWeek.push({
      type: 'gathering',
      id: g.id,
      title: g.groups?.name || g.groups?.name_ar || '',
      subtitle: g.topic || g.topic_ar || '',
      datetime: g.scheduled_at,
      href: `/groups/${g.groups?.id}/gathering/${g.id}`,
    })
  }

  for (const e of (upcomingEventsListRes.data || []) as unknown as EventRecord[]) {
    upcomingThisWeek.push({
      type: 'event',
      id: e.id,
      title: e.title || e.title_ar || '',
      subtitle: '',
      datetime: e.starts_at,
      href: `/events/${e.id}`,
    })
  }

  for (const s of (upcomingSlotsRes.data || []) as unknown as SlotRecord[]) {
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
  const groups = (groupsRes.data || []) as unknown as GroupRecord[]
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
    for (const rec of (allGroupAttendance || []) as unknown as AttendanceRecord[]) {
      if (rec.gatherings?.status !== 'completed') continue
      const isRecent = rec.gatherings!.scheduled_at >= fourWeeksAgo

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

  // 1. Find ministries this user leads + direct leader/co-leader groups (parallel)
  const [{ data: myMinistries }, { data: legacyMinistries }, { data: directGroups }] = await Promise.all([
    supabase
      .from('ministry_members')
      .select('ministry_id')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .eq('role_in_ministry', 'leader'),
    // Also check legacy leader_id on ministries table
    supabase
      .from('ministries')
      .select('id')
      .eq('church_id', churchId)
      .eq('leader_id', profileId),
    // Also include groups where this user is direct leader/co-leader
    supabase
      .from('groups')
      .select('id')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .or(`leader_id.eq.${profileId},co_leader_id.eq.${profileId}`),
  ])

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
    ((memberCountRes.data || []) as unknown as MemberCountRecord[]).map((m) => m.profile_id)
  )
  const activeMembers = distinctMemberIds.size

  // Process attendance rate
  const attendanceRecords = (attendanceRateRes.data || []) as unknown as AttendanceRecord[]
  const completedAttendance = attendanceRecords.filter((a) => a.gatherings?.status === 'completed')
  const presentCount = completedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const attendanceRate = completedAttendance.length > 0
    ? Math.round((presentCount / completedAttendance.length) * 100)
    : 0

  // Process attendance trend
  const trendRecords = (attendanceTrendRes.data || []) as unknown as AttendanceRecord[]
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
  const visitors = (visitorPipelineRes.data || []) as unknown as VisitorRecord[]
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

  for (const v of (slaVisitorsRes.data || []) as unknown as VisitorRecord[]) {
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
  for (const m of (atRiskRes.data || []) as unknown as Array<{ profiles: ProfileRecord }>) {
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

  for (const slot of (unfilledSlotsRes.data || []) as unknown as SlotRecord[]) {
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

  for (const g of (upcomingGatheringsRes.data || []) as unknown as GatheringRecord[]) {
    upcomingThisWeek.push({
      type: 'gathering',
      id: g.id,
      title: g.groups?.name || g.groups?.name_ar || '',
      subtitle: g.topic || g.topic_ar || '',
      datetime: g.scheduled_at,
      href: `/groups/${g.groups?.id}/gathering/${g.id}`,
    })
  }

  for (const e of (upcomingEventsListRes.data || []) as unknown as EventRecord[]) {
    upcomingThisWeek.push({
      type: 'event',
      id: e.id,
      title: e.title || e.title_ar || '',
      subtitle: '',
      datetime: e.starts_at,
      href: `/events/${e.id}`,
    })
  }

  for (const s of (upcomingSlotsRes.data || []) as unknown as SlotRecord[]) {
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

  // Process group health (scoped) — single 8-week query, split in JS
  const groups = (groupsRes.data || []) as unknown as GroupRecord[]
  const groupHealth: GroupHealthRow[] = []

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
    for (const rec of (allGroupAttendance || []) as unknown as AttendanceRecord[]) {
      if (rec.gatherings?.status !== 'completed') continue
      const isRecent = rec.gatherings!.scheduled_at >= fourWeeksAgo

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

// ─── Helpers: Co-led Ministry Groups ─────────────

async function getCoLedMinistryGroupIds(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string
): Promise<string[]> {
  const { data: coLedMinistries } = await supabase
    .from('ministry_members')
    .select('ministry_id')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .eq('role_in_ministry', 'co_leader')

  if (!coLedMinistries || coLedMinistries.length === 0) return []

  const ministryIds = coLedMinistries.map((m) => m.ministry_id)

  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .in('ministry_id', ministryIds)

  return (groups || []).map((g) => g.id)
}

// ─── Leader Dashboard ─────────────────────────────

export async function fetchLeaderDashboard(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string
): Promise<LeaderDashboardData> {
  // Get groups where user is direct leader/co-leader + co-led ministry groups (parallel)
  const [{ data: leaderGroups }, coLedGroupIds] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, name_ar')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .or(`leader_id.eq.${profileId},co_leader_id.eq.${profileId}`),
    // Also include groups from ministries where user is co_leader
    getCoLedMinistryGroupIds(supabase, profileId, churchId),
  ])
  const directGroupIds = new Set((leaderGroups || []).map(g => g.id))
  const additionalGroupIds = coLedGroupIds.filter(id => !directGroupIds.has(id))

  let additionalGroups: { id: string; name: string; name_ar: string | null }[] = []
  if (additionalGroupIds.length > 0) {
    const { data } = await supabase
      .from('groups')
      .select('id, name, name_ar')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .in('id', additionalGroupIds)
    additionalGroups = (data || []) as unknown as GroupRecord[]
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
  for (const m of (memberCountsRes.data || []) as unknown as MemberCountRecord[]) {
    memberCounts.set(m.group_id, (memberCounts.get(m.group_id) || 0) + 1)
  }

  // Attendance per group + prayer counts (parallel)
  const [{ data: groupAttendance }, { data: prayerCounts }] = await Promise.all([
    supabase
      .from('attendance')
      .select('group_id, status, gatherings!inner(status, scheduled_at)')
      .eq('church_id', churchId)
      .in('group_id', groupIds)
      .gte('gatherings.scheduled_at', weeksAgo(12)),
    supabase
      .from('prayer_requests')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('status', 'active'),
  ])

  const fourWeeksAgoStr = weeksAgo(4)
  const groupRateMap = new Map<string, { present: number; total: number }>()
  const weeklyTrendMap = new Map<number, { present: number; total: number; date: Date }>()
  for (const rec of (groupAttendance || []) as unknown as AttendanceRecord[]) {
    if (rec.gatherings?.status !== 'completed') continue
    // Weekly trend (all 12 weeks)
    const date = new Date(rec.gatherings!.scheduled_at)
    const weekNum = getWeekNumber(date)
    if (!weeklyTrendMap.has(weekNum)) weeklyTrendMap.set(weekNum, { present: 0, total: 0, date })
    const weekEntry = weeklyTrendMap.get(weekNum)!
    weekEntry.total++
    if (rec.status === 'present' || rec.status === 'late') weekEntry.present++
    // Per-group rate (last 4 weeks only)
    if (rec.gatherings!.scheduled_at >= fourWeeksAgoStr) {
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

  const prayerCountMap = new Map<string, number>()
  for (const p of (prayerCounts || []) as unknown as PrayerCountRecord[]) {
    prayerCountMap.set(p.group_id, (prayerCountMap.get(p.group_id) || 0) + 1)
  }

  // Build next gathering map (first upcoming per group)
  const nextGatheringMap = new Map<string, NextGatheringRecord>()
  for (const g of (nextGatheringsRes.data || []) as unknown as NextGatheringRecord[]) {
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
  const uniqueAtRisk: ProfileRecord[] = []
  for (const m of (atRiskRes.data || []) as unknown as Array<{ profiles: ProfileRecord }>) {
    const p = m.profiles
    if (!p || seenIds.has(p.id)) continue
    seenIds.add(p.id)
    uniqueAtRisk.push(p)
  }

  // Batch fetch last attendance for all at-risk members in a single query
  const atRiskMemberIds = uniqueAtRisk.map(p => p.id)
  let lastSeenMap = new Map<string, string | null>()
  if (atRiskMemberIds.length > 0) {
    const { data: allLastAtt } = await supabase
      .from('attendance')
      .select('profile_id, marked_at, gatherings!inner(scheduled_at)')
      .in('profile_id', atRiskMemberIds)
      .in('status', ['present', 'late'])
      .order('marked_at', { ascending: false })

    // Group by profile_id, keep only the most recent (first encountered due to desc order)
    for (const rec of (allLastAtt || []) as unknown as LastAttendanceRecord[]) {
      if (!lastSeenMap.has(rec.profile_id)) {
        lastSeenMap.set(rec.profile_id, rec.gatherings?.scheduled_at ?? null)
      }
    }
  }

  const atRiskMembers: AtRiskMember[] = uniqueAtRisk.map((p) => {
    const lastSeen = lastSeenMap.get(p.id) || null
    const daysAbsent = lastSeen
      ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    return {
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      nameAr: `${p.first_name_ar || ''} ${p.last_name_ar || ''}`.trim() || null,
      photoUrl: p.photo_url ?? null,
      lastSeen,
      daysAbsent,
    }
  })

  // Process prayers
  const recentPrayers: RecentPrayer[] = ((prayersRes.data || []) as unknown as PrayerRecord[]).map(p => ({
    id: p.id,
    content: p.content,
    isPrivate: p.is_private,
    submitterName: `${p.profiles?.first_name || ''} ${p.profiles?.last_name || ''}`.trim(),
    submitterNameAr: `${p.profiles?.first_name_ar || ''} ${p.profiles?.last_name_ar || ''}`.trim() || null,
    createdAt: p.created_at,
    status: p.status,
  }))

  // Process recent gatherings
  const recentGatherings = ((recentGatheringsRes.data || []) as unknown as GatheringWithAttendance[]).map(g => {
    const att = (g.attendance || []) as Array<{ status: string }>
    return {
      id: g.id,
      groupId: g.group_id,
      groupName: g.groups?.name || '',
      groupNameAr: g.groups?.name_ar || null,
      scheduledAt: g.scheduled_at,
      topic: g.topic,
      status: g.status,
      presentCount: att.filter((a) => a.status === 'present' || a.status === 'late').length,
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

// ─── Dedicated Ministry Leader Dashboard ─────────

export async function fetchMinistryLeaderDashboardV2(
  supabase: SupabaseClient,
  profileId: string,
  churchId: string
): Promise<MinistryLeaderDashboardData> {
  const now = new Date()

  // Find ministries this user leads (parallel)
  const [{ data: myMinistries }, { data: legacyMinistries }] = await Promise.all([
    supabase
      .from('ministry_members')
      .select('ministry_id, ministries!inner(name, name_ar)')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .eq('role_in_ministry', 'leader'),
    supabase
      .from('ministries')
      .select('id, name, name_ar')
      .eq('church_id', churchId)
      .eq('leader_id', profileId),
  ])

  const allMinistries = [
    ...((myMinistries || []) as unknown as MinistryMemberRecord[]).map((m) => ({ id: m.ministry_id, name: m.ministries?.name, nameAr: m.ministries?.name_ar })),
    ...(legacyMinistries || []).map((m: { id: string; name: string; name_ar: string | null }) => ({ id: m.id, name: m.name, nameAr: m.name_ar })),
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
    groupIds = (groups || []).map((g: { id: string }) => g.id)
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
  const trendRecords = ((attendanceRes as { data: AttendanceRecord[] | null }).data || []) as unknown as AttendanceRecord[]
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
  const upcomingEvents = ((eventsRes as { data: Array<{ events: EventRecord | null }> | null }).data || [])
    .map((n) => n.events)
    .filter((e): e is EventRecord => { if (!e || seenEventIds.has(e.id)) return false; seenEventIds.add(e.id); return true })
    .map((e) => ({ id: e.id, title: e.title || '', titleAr: e.title_ar, startsAt: e.starts_at }))

  // Assignments
  const serviceAssignments = ((assignmentsRes.data || []) as Array<{ event_service_needs?: { events?: EventRecord | null; notes?: string | null; notes_ar?: string | null } | null }>).map((a) => ({
    eventTitle: a.event_service_needs?.events?.title || '',
    eventTitleAr: a.event_service_needs?.events?.title_ar || null,
    role: a.event_service_needs?.notes || '',
    roleAr: a.event_service_needs?.notes_ar || null,
    startsAt: a.event_service_needs?.events?.starts_at || '',
  }))

  // Attention
  const attentionItems: AttentionItem[] = []
  const seenIds = new Set<string>()
  for (const m of ((atRiskRes as { data: Array<{ profiles: ProfileRecord }> | null }).data || []) as Array<{ profiles: ProfileRecord }>) {
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
  const groups = ((groupsRes as { data: GroupRecord[] | null }).data || []) as unknown as GroupRecord[]
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
      // Supabase requires foreign table column ordering via string — type assertion needed
      .order('serving_slots.date' as string & keyof never, { ascending: true })
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
  const completedAtt = ((attendanceRes.data || []) as unknown as AttendanceRecord[]).filter(
    (a) => a.gatherings?.status === 'completed'
  )
  const presentAtt = completedAtt.filter((a) => a.status === 'present' || a.status === 'late')
  const attendanceRate = completedAtt.length > 0
    ? Math.round((presentAtt.length / completedAtt.length) * 100)
    : null

  // Process my groups
  const myGroupIds = ((myGroupsRes.data || []) as unknown as GroupMemberRecord[]).map((m) => m.groups?.id).filter(Boolean)

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

    for (const g of (nextGatherings || []) as Array<{ group_id: string; scheduled_at: string }>) {
      if (!nextGatheringMap.has(g.group_id)) {
        nextGatheringMap.set(g.group_id, g.scheduled_at)
      }
    }
  }

  const myGroups = ((myGroupsRes.data || []) as unknown as Array<{ groups: { id: string; name: string; name_ar: string | null; profiles?: ProfileRecord | null } | null }>)
    .map((m) => {
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
    ((myRegistrationsRes.data || []) as unknown as EventRegistrationRecord[]).map((r) => r.event_id)
  )

  const upcomingEvents = ((upcomingEventsRes.data || []) as unknown as EventRecord[]).map((e) => ({
    id: e.id,
    title: e.title || '',
    titleAr: e.title_ar,
    startsAt: e.starts_at,
    isRegistered: registeredEventIds.has(e.id),
  }))

  // Process serving signups
  const servingSlots = ((servingSignupsRes.data || []) as unknown as ServingSignupRecord[]).map((s) => ({
    id: s.serving_slots?.id || '',
    title: s.serving_slots?.title || '',
    titleAr: s.serving_slots?.title_ar || null,
    date: s.serving_slots?.date || '',
    areaName: s.serving_slots?.serving_areas?.name || '',
    areaNameAr: s.serving_slots?.serving_areas?.name_ar || null,
  }))

  // Process announcements
  const recentAnnouncements = ((announcementsRes.data || []) as unknown as (AnnouncementRecord & { is_pinned: boolean })[]).map((a) => ({
    id: a.id,
    title: a.title || '',
    titleAr: a.title_ar,
    body: a.body,
    bodyAr: a.body_ar,
    publishedAt: a.published_at || '',
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
