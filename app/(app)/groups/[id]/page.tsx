import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { GroupMemberManager } from '@/components/groups/GroupMemberManager'
import { GatheringHistory } from '@/components/gathering/GatheringHistory'
import { PrayerList } from '@/components/gathering/PrayerList'
import { getTranslations, getLocale } from 'next-intl/server'

type Params = { params: Promise<{ id: string }> }

const DAYS_KEY: Record<string, string> = {
  monday: 'dayMonday', tuesday: 'dayTuesday', wednesday: 'dayWednesday',
  thursday: 'dayThursday', friday: 'dayFriday', saturday: 'daySaturday', sunday: 'daySunday',
}

export default async function GroupLeaderPage({ params }: Params) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('groups')
  const locale = await getLocale()

  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select(`
      *,
      ministry:ministry_id(id,name,name_ar),
      leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone),
      co_leader:co_leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url),
      group_members(
        id, role_in_group, joined_at, is_active,
        profile:profile_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,status)
      )
    `)
    .eq('id', id)
    .single()

  if (!group) notFound()

  const isLeaderOrAdmin = (
    group.leader_id === user.profile.id ||
    group.co_leader_id === user.profile.id ||
    ['ministry_leader', 'super_admin'].includes(user.profile.role)
  )

  const isMember = (group.group_members || []).some(
    (m: { profile: { id: string } | null; is_active: boolean }) =>
      m.profile?.id === user.profile.id && m.is_active
  )

  if (!isLeaderOrAdmin && !isMember) redirect('/')

  const activeMembers = (group.group_members || []).filter((m: { is_active: boolean }) => m.is_active)
  const atRiskMembers = activeMembers.filter((m: { profile: { status: string } | null }) => m.profile?.status === 'at_risk')

  const { data: allMembers } = isLeaderOrAdmin ? await supabase
    .from('profiles')
    .select('id,first_name,last_name,first_name_ar,last_name_ar,photo_url,status')
    .eq('status', 'active')
    .order('first_name') : { data: [] }

  // Fetch recent gatherings
  const { data: gatherings } = await supabase
    .from('gatherings')
    .select('id, scheduled_at, topic, status, attendance(count)')
    .eq('group_id', id)
    .order('scheduled_at', { ascending: false })
    .limit(8)

  // Upcoming gathering
  const upcoming = (gatherings || []).find(g => g.status === 'scheduled')

  // Attendance stats (last 8 completed gatherings)
  const completed = (gatherings || []).filter(g => g.status === 'completed')
  const totalAttendees = completed.reduce((sum, g) => sum + (g.attendance?.[0]?.count || 0), 0)
  const avgAttendance = completed.length > 0
    ? Math.round((totalAttendees / completed.length / Math.max(activeMembers.length, 1)) * 100)
    : null

  // Active prayer requests for the group
  const { data: activePrayers } = await supabase
    .from('prayer_requests')
    .select('id, content, is_private, status, submitted_by, created_at, submitter:submitted_by(id,first_name,last_name,first_name_ar,last_name_ar,photo_url)')
    .eq('group_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const dateLocale = locale === 'ar' ? 'ar-LB' : 'en-US'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{group.name_ar || group.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {DAYS_KEY[group.meeting_day] ? t(DAYS_KEY[group.meeting_day] as any) : group.meeting_day}
            {group.meeting_time && ` · ${group.meeting_time}`}
            {group.meeting_location && ` · ${group.meeting_location_ar || group.meeting_location}`}
          </p>
        </div>
        {isLeaderOrAdmin && (
          <Link href={`/groups/${id}/gathering/new`}>
            <Button size="sm">{t('newGatheringButton')}</Button>
          </Link>
        )}
      </div>

      {/* Stats row */}
      {isLeaderOrAdmin && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{activeMembers.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t('leaderStatsMembers')}</p>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{completed.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t('leaderStatsGatherings')}</p>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">
              {avgAttendance !== null ? `${avgAttendance}%` : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{t('leaderStatsAttendanceRate')}</p>
          </div>
        </div>
      )}

      {/* Upcoming gathering */}
      {upcoming && isLeaderOrAdmin && (
        <Link
          href={`/groups/${id}/gathering/${upcoming.id}`}
          className="block rounded-xl bg-zinc-900 text-white p-4 hover:bg-zinc-800 transition-colors"
        >
          <p className="text-xs text-zinc-400 mb-1">{t('upcomingGathering')}</p>
          <p className="font-semibold">{upcoming.topic || t('defaultGatheringTopic')}</p>
          <p className="text-sm text-zinc-300 mt-1">
            {new Date(upcoming.scheduled_at).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-zinc-400 mt-2">{t('openGathering')}</p>
        </Link>
      )}

      {/* At-risk alert */}
      {atRiskMembers.length > 0 && isLeaderOrAdmin && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-red-700 mb-2">⚠️ {t('atRiskTitle')} ({atRiskMembers.length})</p>
          <div className="space-y-2">
            {atRiskMembers.map((m: { id: string; profile: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null } | null }) => {
              const p = m.profile
              if (!p) return null
              return (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.photo_url || undefined} />
                      <AvatarFallback className="text-xs">{(p.first_name_ar || p.first_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-red-700">
                      {p.first_name_ar || p.first_name} {p.last_name_ar || p.last_name}
                    </span>
                  </div>
                  <Link href={`/admin/members/${p.id}`} className="text-xs text-red-500 hover:text-red-700">{t('atRiskViewProfile')}</Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Member Roster */}
      <GroupMemberManager
        groupId={id}
        members={activeMembers}
        allMembers={allMembers || []}
        canManage={isLeaderOrAdmin}
      />

      {/* Gathering History */}
      {gatherings && gatherings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('gatheringHistory')}</h2>
          <GatheringHistory gatherings={gatherings as Parameters<typeof GatheringHistory>[0]['gatherings']} groupId={id} />
        </div>
      )}

      {/* Active Prayer Requests */}
      {(activePrayers && activePrayers.length > 0 || isLeaderOrAdmin) && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">{t('activePrayers')}</h2>
          <PrayerList
            gatheringId=""
            groupId={id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            prayers={(activePrayers || []) as any}
            currentUserId={user.profile.id}
            isLeader={isLeaderOrAdmin}
          />
        </div>
      )}
    </div>
  )
}
