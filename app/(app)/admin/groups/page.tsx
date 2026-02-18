import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GroupsTable } from '@/components/groups/GroupsTable'
import { Button } from '@/components/ui/button'
import { getTranslations } from 'next-intl/server'

export default async function GroupsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['group_leader', 'ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('groups')
  const supabase = await createClient()

  const { data: groups } = await supabase
    .from('groups')
    .select(`
      *,
      ministry:ministry_id(id,name,name_ar),
      leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url),
      group_members(count)
    `)
    .order('name')

  const { data: ministries } = await supabase
    .from('ministries')
    .select('id,name,name_ar')
    .eq('is_active', true)
    .order('name')

  const isAdmin = ['ministry_leader', 'super_admin'].includes(user.profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('adminPageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('adminPageSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href="/admin/groups/ministries">
              <Button variant="outline">{t('ministriesButton')}</Button>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/groups/new">
              <Button>{t('newGroupButton')}</Button>
            </Link>
          )}
        </div>
      </div>

      <GroupsTable
        groups={groups || []}
        ministries={ministries || []}
        isAdmin={isAdmin}
      />
    </div>
  )
}
