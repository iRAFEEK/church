import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { resolveUserScope } from '@/lib/scope'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Users } from 'lucide-react'

export default async function MyGroupPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const scope = await resolveUserScope(supabase, user.id, user.profile.church_id)

  // Also check groups where user is leader_id or co_leader_id directly
  const { data: ledGroups } = await supabase
    .from('groups')
    .select('id')
    .or(`leader_id.eq.${user.profile.id},co_leader_id.eq.${user.profile.id}`)

  const allGroupIds = [...new Set([
    ...scope.groupIds,
    ...(ledGroups || []).map(g => g.id),
  ])]

  if (allGroupIds.length === 0) redirect('/dashboard')
  if (allGroupIds.length === 1) redirect(`/groups/${allGroupIds[0]}`)

  // Multiple groups — show a list
  const t = await getTranslations('groups')
  const locale = await getLocale()
  const isAr = locale === 'ar'

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, name_ar, meeting_day, meeting_time, group_members(count)')
    .in('id', allGroupIds)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t('adminPageTitle')}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(groups || []).map(group => (
          <Link
            key={group.id}
            href={`/groups/${group.id}`}
            className="block p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
          >
            <h2 className="font-semibold text-base">
              {isAr ? (group.name_ar || group.name) : group.name}
            </h2>
            {group.meeting_day && (
              <p className="text-sm text-muted-foreground mt-1">
                {group.meeting_day}{group.meeting_time ? ` · ${group.meeting_time}` : ''}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {group.group_members?.[0]?.count || 0} {t('leaderStatsMembers')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
