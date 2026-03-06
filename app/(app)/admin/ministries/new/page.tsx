import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MinistryForm } from '@/components/ministries/MinistryForm'
import { getTranslations } from 'next-intl/server'

export default async function NewMinistryPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/dashboard')

  const t = await getTranslations('ministries')

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('dialogCreateTitle')}</h1>
      </div>
      <MinistryForm />
    </div>
  )
}
