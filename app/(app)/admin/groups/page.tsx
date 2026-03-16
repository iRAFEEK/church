import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { getCachedMinistries } from '@/lib/cache/queries'
import Link from 'next/link'
import { GroupsTable } from '@/components/groups/GroupsTable'
import { Button } from '@/components/ui/button'
import { getTranslations } from 'next-intl/server'
import { resolveUserScope } from '@/lib/scope'

export default async function GroupsPage() {
  const user = await requireRole('group_leader', 'super_admin')

  const t = await getTranslations('groups')
  const supabase = await createClient()

  const isSuperAdmin = user.profile.role === 'super_admin'

  // Scope: group leaders see only their groups, super admins see all
  let groupsQuery = supabase
    .from('groups')
    .select(`
      *,
      ministry:ministry_id(id,name,name_ar),
      leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url),
      group_members(count)
    `)
    .eq('church_id', user.profile.church_id)
    .order('name')

  if (!isSuperAdmin) {
    const scope = await resolveUserScope(supabase, user.id, user.profile.church_id)
    if (scope.groupIds.length > 0) {
      groupsQuery = groupsQuery.in('id', scope.groupIds)
    } else {
      // No groups — show empty
      groupsQuery = groupsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: groups } = await groupsQuery

  const ministries = await getCachedMinistries(user.profile.church_id)

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('adminPageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('adminPageSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Link href="/admin/groups/new">
              <Button>{t('newGroupButton')}</Button>
            </Link>
          )}
        </div>
      </div>

      <GroupsTable
        groups={groups || []}
        ministries={ministries || []}
        isAdmin={isSuperAdmin}
      />
    </div>
  )
}
