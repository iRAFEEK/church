import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { TemplateForm } from '@/components/events/TemplateForm'

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user.resolvedPermissions.can_manage_templates) redirect('/dashboard')

  const t = await getTranslations('templates')
  const supabase = await createClient()

  const { data: template } = await supabase
    .from('event_templates')
    .select('id, church_id, name, name_ar, event_type, title, title_ar, description, description_ar, location, capacity, is_public, registration_required, notes, notes_ar, recurrence_type, recurrence_day, default_start_time, default_end_time, custom_fields')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!template) notFound()

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      <h1 className="text-xl font-bold text-zinc-900">{t('editTemplate')}</h1>
      <TemplateForm template={template} />
    </div>
  )
}
