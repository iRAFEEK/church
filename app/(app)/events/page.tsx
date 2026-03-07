import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/events/EventCard'
import { getTranslations } from 'next-intl/server'
import { Plus, Copy } from 'lucide-react'

export default async function EventsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('events')
  const supabase = await createClient()
  const admin = isAdmin(user.profile)

  let query = supabase
    .from('events')
    .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, status')
    .eq('church_id', user.profile.church_id)

  if (admin) {
    query = query.order('starts_at', { ascending: false }).limit(50)
  } else {
    query = query
      .in('status', ['published'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(30)
  }

  const { data: events } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {admin ? t('adminPageTitle') : t('upcomingEvents')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {admin ? t('adminPageSubtitle') : t('upcomingEventsSubtitle')}
          </p>
        </div>
        {admin && (
          <div className="flex gap-2">
            <Link href="/admin/events/from-template">
              <Button variant="outline">
                <Copy className="h-4 w-4 me-1" />
                {t('fromTemplate')}
              </Button>
            </Link>
            <Link href="/admin/events/new">
              <Button>
                <Plus className="h-4 w-4 me-1" />
                {t('newEvent')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {(!events || events.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground">
          {admin ? t('noEvents') : t('noUpcomingEvents')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              href={admin ? `/admin/events/${event.id}` : `/events/${event.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
