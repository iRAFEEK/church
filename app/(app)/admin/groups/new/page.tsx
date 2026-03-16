import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GroupForm } from '@/components/groups/GroupForm'
import { getTranslations } from 'next-intl/server'

export default async function NewGroupPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/dashboard')

  const t = await getTranslations('groups')
  const supabase = await createClient()

  const { data: leaders } = await supabase
    .from('profiles')
    .select('id,first_name,last_name,first_name_ar,last_name_ar')
    .in('role', ['group_leader', 'ministry_leader', 'super_admin'])
    .eq('church_id', user.profile.church_id)
    .eq('status', 'active')
    .order('first_name')

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('newGroupPageTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('newGroupPageSubtitle')}</p>
      </div>
      <GroupForm leaders={leaders || []} />
    </div>
  )
}
