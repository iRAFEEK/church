import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { AttendanceSection } from '@/components/gathering/AttendanceSection'
import { PrayerList } from '@/components/gathering/PrayerList'
import { formatGatheringDate, formatGatheringTime } from '@/lib/gatherings'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type Params = { params: Promise<{ id: string; gatheringId: string }> }

export default async function GatheringPage({ params }: Params) {
  const { id: group_id, gatheringId } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('gathering')

  const supabase = await createClient()

  const { data: gathering } = await supabase
    .from('gatherings')
    .select(`
      *,
      group:group_id(id, name, name_ar, leader_id, co_leader_id),
      attendance(
        id, profile_id, status, excuse_reason,
        profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
      ),
      prayer_requests(
        id, content, is_private, status, submitted_by, created_at,
        submitter:submitted_by(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
      )
    `)
    .eq('id', gatheringId)
    .single()

  if (!gathering) notFound()

  // Get all active group members for the roster
  const { data: groupMembers } = await supabase
    .from('group_members')
    .select('profile_id, profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, status)')
    .eq('group_id', group_id)
    .eq('is_active', true) as { data: Array<{
      profile_id: string
      profile: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null; status: string } | null
    }> | null }

  const group = gathering.group as { id: string; name: string; name_ar: string | null; leader_id: string | null; co_leader_id: string | null }
  const isLeader = group.leader_id === user.profile.id || group.co_leader_id === user.profile.id
  const isAdmin = ['ministry_leader', 'super_admin'].includes(user.profile.role)
  const canManage = isLeader || isAdmin

  if (!canManage) {
    // Members can still view but not edit
    const isMember = (groupMembers || []).some(m => m.profile_id === user.profile.id)
    if (!isMember) redirect('/dashboard')
  }

  const isCompleted = gathering.status === 'completed'

  // Build attendance map: profile_id → status
  const attendanceMap = new Map(
    (gathering.attendance as Array<{ profile_id: string; status: string; id: string }>)
      .map(a => [a.profile_id, a])
  )

  // Build member list with current attendance status
  const members = (groupMembers || []).map(gm => {
    const profile = gm.profile as { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null; status: string }
    const att = attendanceMap.get(gm.profile_id)
    return {
      profile_id: gm.profile_id,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      first_name_ar: profile?.first_name_ar,
      last_name_ar: profile?.last_name_ar,
      photo_url: profile?.photo_url,
      attendance_status: (att as { status?: string } | undefined)?.status || 'absent',
    }
  })

  const prayers = gathering.prayer_requests as Array<{
    id: string; content: string; is_private: boolean; status: string; submitted_by: string; created_at: string;
    submitter: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null } | null
  }>

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back navigation */}
      <Link
        href={`/groups/${group_id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 active:text-zinc-900 transition-colors -ms-1"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {group.name_ar || group.name}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">
          {gathering.topic || t('defaultTopic')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {formatGatheringDate(gathering.scheduled_at)} · {formatGatheringTime(gathering.scheduled_at)}
        </p>
        {gathering.location && (
          <p className="text-sm text-zinc-400 mt-0.5">📍 {gathering.location_ar || gathering.location}</p>
        )}
        {isCompleted && (
          <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            {t('completed')}
          </span>
        )}
      </div>

      {/* Attendance */}
      <AttendanceSection
        gatheringId={gatheringId}
        groupId={group_id}
        members={members}
        canManage={canManage && !isCompleted}
        isCompleted={isCompleted}
      />

      {/* Prayer Requests */}
      <PrayerList
        gatheringId={gatheringId}
        groupId={group_id}
        prayers={prayers}
        currentUserId={user.profile.id}
        isLeader={canManage}
      />

      {/* Notes */}
      {gathering.notes && (
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 mb-2">{t('notes')}</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{gathering.notes}</p>
        </div>
      )}
    </div>
  )
}
