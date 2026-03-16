import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MinistryMemberManager } from '@/components/ministries/MinistryMemberManager'
import { MinistryEventsList } from '@/components/ministries/MinistryEventsList'
import { MinistryMeetings } from '@/components/ministries/MinistryMeetings'
import { getTranslations } from 'next-intl/server'

type Params = { params: Promise<{ id: string }> }

export default async function MinistryDetailPage({ params }: Params) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const isAdmin = ['ministry_leader', 'super_admin'].includes(user.profile.role)
  if (!isAdmin) redirect('/dashboard')

  const t = await getTranslations('ministries')
  const supabase = await createClient()

  // Fire ministry query and allMembers query in parallel
  interface MinistryDetail {
    id: string
    name: string
    name_ar: string | null
    description: string | null
    description_ar: string | null
    is_active: boolean
    photo_url: string | null
    leader_id: string | null
    leader: {
      id: string; first_name: string | null; last_name: string | null;
      first_name_ar: string | null; last_name_ar: string | null;
      photo_url: string | null; phone: string | null
    } | null
    ministry_members: Array<{
      id: string; role_in_ministry: string; joined_at: string; is_active: boolean;
      profile: {
        id: string; first_name: string | null; last_name: string | null;
        first_name_ar: string | null; last_name_ar: string | null;
        photo_url: string | null; phone: string | null; status: string
      } | null
    }>
    groups: Array<{
      id: string; name: string; name_ar: string | null; type: string; is_active: boolean
    }>
  }
  let ministry: MinistryDetail | null = null
  const [result, { data: allMembers }] = await Promise.all([
    supabase
      .from('ministries')
      .select(`
        *,
        leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone),
        ministry_members(
          id, role_in_ministry, joined_at, is_active,
          profile:profile_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,status)
        ),
        groups(id,name,name_ar,type,is_active)
      `)
      .eq('id', id)
      .eq('church_id', user.profile.church_id)
      .single(),
    supabase
      .from('profiles')
      .select('id,first_name,last_name,first_name_ar,last_name_ar,photo_url,status')
      .eq('church_id', user.profile.church_id)
      .eq('status', 'active')
      .order('first_name'),
  ])

  if (result.error?.message?.includes('ministry_members')) {
    const fallback = await supabase
      .from('ministries')
      .select('*, leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone), groups(id,name,name_ar,type,is_active)')
      .eq('id', id)
      .eq('church_id', user.profile.church_id)
      .single()
    ministry = fallback.data ? { ...fallback.data, ministry_members: [] } as MinistryDetail : null
  } else {
    ministry = result.data as MinistryDetail | null
  }

  if (!ministry) notFound()

  const activeMembers = (ministry.ministry_members || []).filter(
    (m: { is_active: boolean }) => m.is_active
  )

  const leader = ministry.leader
  const groups = ministry.groups || []

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {ministry.photo_url && (
            <Image
              src={ministry.photo_url}
              alt={ministry.name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-xl object-cover border border-zinc-200"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{ministry.name_ar || ministry.name}</h1>
            {ministry.name_ar && <p className="text-sm text-zinc-400">{ministry.name}</p>}
            <div className="flex gap-2 mt-2 flex-wrap">
              {!ministry.is_active && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">{t('detailInactive')}</span>
              )}
              <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">
                {activeMembers.length} {t('detailMembers')}
              </span>
            </div>
          </div>
        </div>
        <Link href={`/admin/ministries/${id}/edit`}>
          <Button variant="outline" size="sm">{t('detailEditButton')}</Button>
        </Link>
      </div>

      {/* Description */}
      {(ministry.description || ministry.description_ar) && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 mb-2">{t('detailDescription')}</p>
          <p className="text-sm text-zinc-700">{ministry.description_ar || ministry.description}</p>
          {ministry.description_ar && ministry.description && (
            <p className="text-xs text-zinc-400 mt-1" dir="ltr">{ministry.description}</p>
          )}
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Legacy Leader */}
        {leader && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500 mb-3">{t('leaderLabel')}</p>
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
          </div>
        )}

        {/* Groups */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">{t('detailGroups')}</p>
          {groups.length === 0 ? (
            <p className="text-sm text-zinc-400">{t('detailNoGroups')}</p>
          ) : (
            <div className="space-y-2">
              {groups.map(g => (
                <Link key={g.id} href={`/admin/groups/${g.id}`} className="block">
                  <div className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900">
                    <span>{g.name_ar || g.name}</span>
                    {!g.is_active && (
                      <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">{t('detailInactive')}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meetings */}
      <MinistryMeetings
        ministryId={id}
        members={(activeMembers || []).map((m: { profile: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null } | null }) => m.profile).filter(Boolean) as Array<{ id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null }>}
      />

      {/* Events */}
      <MinistryEventsList ministryId={id} />

      {/* Member Roster */}
      <MinistryMemberManager
        ministryId={id}
        members={activeMembers}
        allMembers={allMembers || []}
        canManage={isAdmin}
      />
    </div>
  )
}
