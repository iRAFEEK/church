import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TemplateForm } from '@/components/events/TemplateForm'

export default async function NewTemplatePage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/dashboard')

  const t = await getTranslations('templates')

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-zinc-900">{t('newTemplate')}</h1>
      <TemplateForm />
    </div>
  )
}
