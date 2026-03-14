import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ServingAreaForm } from '@/components/serving/ServingAreaForm'
import { getTranslations } from 'next-intl/server'

export default async function EditServingAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/dashboard')

  const t = await getTranslations('serving')
  const supabase = await createClient()

  const { data: area } = await supabase
    .from('serving_areas')
    .select('id, church_id, ministry_id, name, name_ar, description, description_ar, is_active, created_at, updated_at')
    .eq('id', id)
    .single()

  if (!area) notFound()

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('editArea')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{area.name}</p>
      </div>

      <ServingAreaForm area={area} />
    </div>
  )
}
