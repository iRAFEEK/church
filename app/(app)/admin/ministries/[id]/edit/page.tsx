import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { MinistryForm } from '@/components/ministries/MinistryForm'
import { getTranslations } from 'next-intl/server'

type Params = { params: Promise<{ id: string }> }

export default async function EditMinistryPage({ params }: Params) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/dashboard')

  const t = await getTranslations('ministries')
  const supabase = await createClient()

  const { data: ministry } = await supabase
    .from('ministries')
    .select('id,name,name_ar,description,description_ar,photo_url,is_active')
    .eq('id', id)
    .single()

  if (!ministry) notFound()

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('dialogEditTitle')}</h1>
      </div>
      <MinistryForm ministry={ministry} />
    </div>
  )
}
