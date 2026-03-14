import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WeeklyAttendancePoint,
  GroupHealthRow,
} from '@/types/dashboard'

// ─── Helpers ──────────────────────────────────────

export function startOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function weeksAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function endOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() + (6 - d.getDay()))
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

export function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
}

export function formatWeekLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// ─── Shared types for dashboard records ──────────

interface AttendanceRecord {
  status: string
  gatherings?: { status: string; scheduled_at: string } | null
  group_id?: string
}

interface GroupWithHealth {
  id: string
  name: string
  name_ar: string | null
  profiles?: { first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null } | null
  group_members?: Array<{ is_active: boolean; profiles?: { status: string } | null }> | null
}

// ─── Shared: Build attendance trend from records ──

export function buildAttendanceTrend(
  records: AttendanceRecord[],
  filterStatus: string = 'completed'
): { trend: WeeklyAttendancePoint[]; rate: number } {
  const completedRecords = records.filter((a) => a.gatherings?.status === filterStatus)
  const presentCount = completedRecords.filter((a) => a.status === 'present' || a.status === 'late').length
  const rate = completedRecords.length > 0
    ? Math.round((presentCount / completedRecords.length) * 100)
    : 0

  const weeklyMap = new Map<number, { present: number; total: number; date: Date }>()
  for (const rec of completedRecords) {
    const date = new Date(rec.gatherings!.scheduled_at)
    const weekNum = getWeekNumber(date)
    if (!weeklyMap.has(weekNum)) {
      weeklyMap.set(weekNum, { present: 0, total: 0, date })
    }
    const week = weeklyMap.get(weekNum)!
    week.total++
    if (rec.status === 'present' || rec.status === 'late') week.present++
  }

  const trend: WeeklyAttendancePoint[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, data]) => ({
      weekLabel: formatWeekLabel(data.date),
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }))

  return { trend, rate }
}

// ─── Shared: Build group health rows ──────────────

export function buildGroupHealthRows(
  groups: GroupWithHealth[],
  groupAttendanceMap: Map<string, { present: number; total: number }>,
  prevGroupAttendanceMap: Map<string, number>
): GroupHealthRow[] {
  return groups.map((g) => {
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

    return {
      id: g.id,
      name: g.name,
      nameAr: g.name_ar,
      leaderName: leader ? `${leader.first_name || ''} ${leader.last_name || ''}`.trim() : '',
      leaderNameAr: leader ? `${leader.first_name_ar || ''} ${leader.last_name_ar || ''}`.trim() || null : null,
      memberCount: activeMembers.length,
      attendanceRate: currentRate,
      atRiskCount,
      trend,
    }
  })
}

// ─── Shared: Co-led Ministry Groups ───────────────

export async function getCoLedMinistryGroupIds(
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
