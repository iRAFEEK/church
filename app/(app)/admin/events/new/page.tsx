import { requirePermission } from '@/lib/auth'
import { EventForm } from '@/components/events/EventForm'
import { getTranslations } from 'next-intl/server'

export default async function NewEventPage() {
  await requirePermission('can_manage_events')

  const t = await getTranslations('events')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('newEventPageTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('newEventPageSubtitle')}</p>
      </div>
      <EventForm />
    </div>
  )
}
