import { requirePermission } from '@/lib/auth'
import { EventForm } from '@/components/events/EventForm'
import { getTranslations } from 'next-intl/server'

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await requirePermission('can_manage_events')

  const t = await getTranslations('events')
  const params = await searchParams
  const defaultDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('newEventPageTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('newEventPageSubtitle')}</p>
      </div>
      <EventForm defaultDate={defaultDate} />
    </div>
  )
}
