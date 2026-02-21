import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ServingSlotForm } from '@/components/serving/ServingSlotForm'
import { getTranslations } from 'next-intl/server'

export default async function EditServingSlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/')

  const t = await getTranslations('serving')
  const supabase = await createClient()

  const { data: slot } = await supabase
    .from('serving_slots')
    .select('*')
    .eq('id', id)
    .single()

  if (!slot) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('editSlot')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{slot.title}</p>
      </div>

      <ServingSlotForm slot={slot} />
    </div>
  )
}
