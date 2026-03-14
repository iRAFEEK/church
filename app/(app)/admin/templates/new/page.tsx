import { requirePermission } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { TemplateForm } from '@/components/events/TemplateForm'

export default async function NewTemplatePage() {
  await requirePermission('can_manage_templates')

  const t = await getTranslations('templates')

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      <h1 className="text-xl font-bold text-zinc-900">{t('newTemplate')}</h1>
      <TemplateForm />
    </div>
  )
}
