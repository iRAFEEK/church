import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MinistryCRUD } from '@/components/groups/MinistryCRUD'
import { getTranslations } from 'next-intl/server'

export default async function MinistriesPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('ministries')
  const supabase = await createClient()

  const { data: ministries } = await supabase
    .from('ministries')
    .select('*, leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url)')
    .order('name')

  const { data: leaders } = await supabase
    .from('profiles')
    .select('id,first_name,last_name,first_name_ar,last_name_ar')
    .in('role', ['group_leader', 'ministry_leader', 'super_admin'])
    .eq('status', 'active')
    .order('first_name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('pageSubtitle')}</p>
      </div>
      <MinistryCRUD ministries={ministries || []} leaders={leaders || []} />
    </div>
  )
}
