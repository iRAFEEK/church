import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ServingSlotForm } from '@/components/serving/ServingSlotForm'
import { getTranslations } from 'next-intl/server'

export default async function NewServingSlotPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/')

  const t = await getTranslations('serving')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('newSlot')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('newSlotSubtitle')}</p>
      </div>

      <ServingSlotForm />
    </div>
  )
}
