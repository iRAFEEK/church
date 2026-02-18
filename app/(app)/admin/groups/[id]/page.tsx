import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GroupMemberManager } from '@/components/groups/GroupMemberManager'
import { getTranslations } from 'next-intl/server'

type Params = { params: Promise<{ id: string }> }

const GROUP_TYPE_KEY: Record<string, string> = {
  small_group: 'typeSmallGroup',
  youth: 'typeYouth',
  women: 'typeWomen',
  men: 'typeMen',
  family: 'typeFamily',
  prayer: 'typePrayer',
  other: 'typeOther',
}

const DAYS_KEY: Record<string, string> = {
  monday: 'dayMonday', tuesday: 'dayTuesday', wednesday: 'dayWednesday',
  thursday: 'dayThursday', friday: 'dayFriday', saturday: 'daySaturday', sunday: 'daySunday',
}

const FREQUENCY_KEY: Record<string, string> = {
  weekly: 'frequencyWeekly',
  biweekly: 'frequencyBiweekly',
  monthly: 'frequencyMonthly',
  irregular: 'frequencyIrregular',
}

export default async function GroupDetailPage({ params }: Params) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('groups')

  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select(`
      *,
      ministry:ministry_id(id,name,name_ar),
      leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,email),
      co_leader:co_leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url),
      group_members(
        id, role_in_group, joined_at, is_active,
        profile:profile_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,status)
      )
    `)
    .eq('id', id)
    .single()

  if (!group) notFound()

  const isAdmin = ['ministry_leader', 'super_admin'].includes(user.profile.role)
  const isLeader = group.leader_id === user.profile.id || group.co_leader_id === user.profile.id

  if (!isAdmin && !isLeader) redirect('/')

  // Get all church members for adding to group
  const { data: allMembers } = isAdmin || isLeader ? await supabase
    .from('profiles')
    .select('id,first_name,last_name,first_name_ar,last_name_ar,photo_url,status')
    .eq('status', 'active')
    .order('first_name') : { data: [] }

  const activeMembers = (group.group_members || []).filter((m: { is_active: boolean }) => m.is_active)

  const leader = group.leader as {
    id: string; first_name: string | null; last_name: string | null;
    first_name_ar: string | null; last_name_ar: string | null;
    photo_url: string | null; phone: string | null; email: string | null
  } | null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{group.name_ar || group.name}</h1>
          {group.name_ar && <p className="text-sm text-zinc-400">{group.name}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">
              {GROUP_TYPE_KEY[group.type] ? t(GROUP_TYPE_KEY[group.type] as any) : group.type}
            </span>
            {group.ministry && (
              <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">
                {(group.ministry as { name_ar?: string; name: string }).name_ar || (group.ministry as { name: string }).name}
              </span>
            )}
            {!group.is_active && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">{t('detailInactive')}</span>
            )}
          </div>
        </div>
        {isAdmin && (
          <Link href={`/admin/groups/${id}/edit`}>
            <Button variant="outline" size="sm">{t('detailEditButton')}</Button>
          </Link>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Leader */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">{t('detailLeader')}</p>
          {leader ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={leader.photo_url || undefined} />
                <AvatarFallback>{(leader.first_name_ar || leader.first_name || '?')[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-zinc-900">
                  {leader.first_name_ar || leader.first_name} {leader.last_name_ar || leader.last_name}
                </p>
                {leader.phone && <p className="text-xs text-zinc-500">{leader.phone}</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{t('detailLeaderUnset')}</p>
          )}
        </div>

        {/* Meeting */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">{t('detailMeeting')}</p>
          <div className="space-y-1 text-sm text-zinc-700">
            {group.meeting_day && (
              <p>📅 {DAYS_KEY[group.meeting_day] ? t(DAYS_KEY[group.meeting_day] as any) : group.meeting_day}
                {group.meeting_time && ` - ${group.meeting_time}`}
              </p>
            )}
            {group.meeting_location && <p>📍 {group.meeting_location_ar || group.meeting_location}</p>}
            <p>🔄 {FREQUENCY_KEY[group.meeting_frequency] ? t(FREQUENCY_KEY[group.meeting_frequency] as any) : group.meeting_frequency}</p>
            <p>👥 {activeMembers.length} {t('leaderStatsMembers')}{group.max_members ? ` / ${group.max_members}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Member Roster */}
      <GroupMemberManager
        groupId={id}
        members={activeMembers}
        allMembers={allMembers || []}
        canManage={isAdmin || isLeader}
      />
    </div>
  )
}
