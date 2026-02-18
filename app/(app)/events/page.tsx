import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EventCard } from '@/components/events/EventCard'
import { getTranslations } from 'next-intl/server'

export default async function EventsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('events')
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('church_id', user.profile.church_id)
    .in('status', ['published'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('upcomingEvents')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('upcomingEventsSubtitle')}</p>
      </div>

      {(!events || events.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('noUpcomingEvents')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <EventCard key={event.id} event={event} href={`/events/${event.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
