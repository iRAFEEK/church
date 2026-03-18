import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { resolveUserScope } from '@/lib/scope'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Users, UserPlus, Clock } from 'lucide-react'

export default async function MyGroupPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('groups')
  const locale = await getLocale()
  const isAr = locale.startsWith('ar')
  const supabase = await createClient()

  const [scope, { data: ledGroups }] = await Promise.all([
    resolveUserScope(supabase, user.id, user.profile.church_id),
    supabase
      .from('groups')
      .select('id')
      .or(`leader_id.eq.${user.profile.id},co_leader_id.eq.${user.profile.id}`),
  ])

  const myGroupIds = [...new Set([
    ...scope.groupIds,
    ...(ledGroups || []).map(g => g.id),
  ])]

  // Fetch user's groups and open groups in parallel
  const [{ data: myGroups }, { data: openGroups }] = await Promise.all([
    myGroupIds.length > 0
      ? supabase
          .from('groups')
          .select('id, name, name_ar, meeting_day, meeting_time, meeting_location, meeting_location_ar, group_members(count)')
          .in('id', myGroupIds)
          .order('name')
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from('groups')
      .select('id, name, name_ar, meeting_day, meeting_time, meeting_location, meeting_location_ar, group_members(count)')
      .eq('church_id', user.profile.church_id)
      .eq('is_active', true)
      .eq('is_open', true)
      .order('name')
      .limit(25),
  ])

  // Exclude groups the user is already in from the open groups list
  const filteredOpenGroups = (openGroups || []).filter(g => !myGroupIds.includes(g.id))

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t('myGroupsTitle')}</h1>
      </div>

      {/* Your Groups */}
      {myGroups && myGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('yourGroupsSection')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {myGroups.map(group => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <h3 className="font-semibold text-base">
                  {isAr ? (group.name_ar || group.name) : group.name}
                </h3>
                {group.meeting_day && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.meeting_day}{group.meeting_time ? ` · ${group.meeting_time}` : ''}
                  </p>
                )}
                {(group.meeting_location || group.meeting_location_ar) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAr ? (group.meeting_location_ar || group.meeting_location) : group.meeting_location}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {group.group_members?.[0]?.count || 0} {t('leaderStatsMembers')}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Open Groups */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('openGroupsSection')}
        </h2>

        {filteredOpenGroups.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredOpenGroups.map(group => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="font-semibold text-base">
                    {isAr ? (group.name_ar || group.name) : group.name}
                  </h3>
                </div>
                {group.meeting_day && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.meeting_day}{group.meeting_time ? ` · ${group.meeting_time}` : ''}
                  </p>
                )}
                {(group.meeting_location || group.meeting_location_ar) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAr ? (group.meeting_location_ar || group.meeting_location) : group.meeting_location}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {group.group_members?.[0]?.count || 0} {t('leaderStatsMembers')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">{t('noOpenGroupsTitle')}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">{t('noOpenGroupsDescription')}</p>
          </div>
        )}
      </section>
    </div>
  )
}
