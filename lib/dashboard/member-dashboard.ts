import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemberDashboardData } from '@/types/dashboard'

// ─── Row shapes for Supabase join queries (no Database generic) ───

interface AttendanceWithGatheringRow {
  status: string
  gatherings?: { status: string } | null
}

interface GroupMemberWithGroupRow {
  groups?: {
    id: string
    name: string
    name_ar: string | null
    leader_id: string | null
    profiles?: {
      first_name: string | null; last_name: string | null
      first_name_ar: string | null; last_name_ar: string | null
    } | null
  } | null
}

interface GatheringRow {
  group_id: string
  scheduled_at: string
}

interface RegistrationRow {
  event_id: string
}

interface EventRow {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
}

interface ServingSignupRow {
  serving_slots?: {
    id: string
    title: string
    title_ar: string | null
    date: string
    serving_areas?: { name: string; name_ar: string | null } | null
  } | null
}

interface AnnouncementRow {
  id: string
  title: string
  title_ar: string | null
  body: string | null
  body_ar: string | null
  published_at: string
  is_pinned: boolean
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typing doesn't support nested column in .order()
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
  const completedAtt = ((attendanceRes.data || []) as unknown as AttendanceWithGatheringRow[]).filter(
    (a) => a.gatherings?.status === 'completed'
  )
  const presentAtt = completedAtt.filter((a) => a.status === 'present' || a.status === 'late')
  const attendanceRate = completedAtt.length > 0
    ? Math.round((presentAtt.length / completedAtt.length) * 100)
    : null

  // Process my groups
  const myGroupIds = ((myGroupsRes.data || []) as unknown as GroupMemberWithGroupRow[]).map((m) => m.groups?.id).filter(Boolean) as string[]

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

    for (const g of (nextGatherings || []) as GatheringRow[]) {
      if (!nextGatheringMap.has(g.group_id)) {
        nextGatheringMap.set(g.group_id, g.scheduled_at)
      }
    }
  }

  const myGroups = ((myGroupsRes.data || []) as unknown as GroupMemberWithGroupRow[])
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
    ((myRegistrationsRes.data || []) as RegistrationRow[]).map((r) => r.event_id)
  )

  const upcomingEvents = ((upcomingEventsRes.data || []) as EventRow[]).map((e) => ({
    id: e.id,
    title: e.title,
    titleAr: e.title_ar,
    startsAt: e.starts_at,
    isRegistered: registeredEventIds.has(e.id),
  }))

  // Process serving signups
  const servingSlots = ((servingSignupsRes.data || []) as unknown as ServingSignupRow[]).map((s) => ({
    id: s.serving_slots?.id || '',
    title: s.serving_slots?.title || '',
    titleAr: s.serving_slots?.title_ar || null,
    date: s.serving_slots?.date || '',
    areaName: s.serving_slots?.serving_areas?.name || '',
    areaNameAr: s.serving_slots?.serving_areas?.name_ar || null,
  }))

  // Process announcements
  const recentAnnouncements = ((announcementsRes.data || []) as AnnouncementRow[]).map((a) => ({
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
