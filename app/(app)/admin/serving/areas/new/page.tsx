import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ServingAreaForm } from '@/components/serving/ServingAreaForm'
import { getTranslations } from 'next-intl/server'

export default async function NewServingAreaPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/')

  const t = await getTranslations('serving')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('newArea')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('newAreaSubtitle')}</p>
      </div>

      <ServingAreaForm />
    </div>
  )
}
