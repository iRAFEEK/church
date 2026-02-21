// ─── Shared Types ─────────────────────────────────

export interface WeeklyAttendancePoint {
  weekLabel: string
  rate: number // 0–100
}

export interface VisitorPipelineItem {
  status: 'new' | 'assigned' | 'contacted' | 'converted'
  count: number
}

export interface AttentionItem {
  type: 'visitor_sla' | 'at_risk_member' | 'unfilled_slot'
  id: string
  label: string
  sublabel: string
  href: string
}

export interface UpcomingItem {
  type: 'gathering' | 'event' | 'serving_slot'
  id: string
  title: string
  subtitle: string
  datetime: string
  href: string
}

export interface GroupHealthRow {
  id: string
  name: string
  nameAr: string | null
  leaderName: string
  leaderNameAr: string | null
  memberCount: number
  attendanceRate: number | null
  atRiskCount: number
  trend: 'up' | 'down' | 'stable'
}

// ─── Admin Dashboard ──────────────────────────────

export interface AdminDashboardData {
  kpis: {
    activeMembers: { value: number; trend: number }
    newVisitors: { value: number; slaAlert: number }
    attendanceRate: { value: number }
    upcomingEvents: { value: number }
  }
  attendanceTrend: WeeklyAttendancePoint[]
  visitorPipeline: VisitorPipelineItem[]
  attentionItems: AttentionItem[]
  upcomingThisWeek: UpcomingItem[]
  groupHealth: GroupHealthRow[]
}

// ─── Leader Dashboard ─────────────────────────────

export interface LeaderGroupSummary {
  id: string
  name: string
  nameAr: string | null
  memberCount: number
  attendanceRate: number | null
  activePrayerCount: number
  nextGathering: { id: string; scheduledAt: string; topic: string | null } | null
}

export interface AtRiskMember {
  id: string
  name: string
  nameAr: string | null
  photoUrl: string | null
  lastSeen: string | null
  daysAbsent: number
}

export interface RecentPrayer {
  id: string
  content: string
  isPrivate: boolean
  submitterName: string
  submitterNameAr: string | null
  createdAt: string
  status: string
}

export interface LeaderDashboardData {
  groups: LeaderGroupSummary[]
  atRiskMembers: AtRiskMember[]
  recentPrayers: RecentPrayer[]
  assignedVisitorCount: number
  recentGatherings: Array<{
    id: string
    groupId: string
    groupName: string
    groupNameAr: string | null
    scheduledAt: string
    topic: string | null
    status: string
    presentCount: number
    totalCount: number
  }>
}

// ─── Member Dashboard ─────────────────────────────

export interface MemberGroupCard {
  id: string
  name: string
  nameAr: string | null
  leaderName: string
  leaderNameAr: string | null
  nextGathering: string | null
}

export interface MemberDashboardData {
  kpis: {
    attendanceRate: number | null
    milestoneCount: number
    groupCount: number
    unreadNotifications: number
  }
  myGroups: MemberGroupCard[]
  upcomingEvents: Array<{
    id: string
    title: string
    titleAr: string | null
    startsAt: string
    isRegistered: boolean
  }>
  servingSlots: Array<{
    id: string
    title: string
    titleAr: string | null
    date: string
    areaName: string
    areaNameAr: string | null
  }>
  recentAnnouncements: Array<{
    id: string
    title: string
    titleAr: string | null
    body: string | null
    bodyAr: string | null
    publishedAt: string
    isPinned: boolean
  }>
}
