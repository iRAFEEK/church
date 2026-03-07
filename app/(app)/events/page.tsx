import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTranslations } from 'next-intl/server'
import { Plus, Copy } from 'lucide-react'
import { EventsPageClient } from '@/components/events/EventsPageClient'

const PAGE_SIZE = 20

export default async function EventsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('events')
  const supabase = await createClient()
  const admin = isAdmin(user.profile)

  // Fetch initial events, ministries, and groups in parallel
  let eventsQuery = supabase
    .from('events')
    .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, status')
    .eq('church_id', user.profile.church_id)
    .limit(PAGE_SIZE)

  if (admin) {
    eventsQuery = eventsQuery.order('starts_at', { ascending: false })
  } else {
    eventsQuery = eventsQuery
      .in('status', ['published'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
  }

  const [eventsResult, ministriesResult, groupsResult] = await Promise.all([
    eventsQuery,
    supabase
      .from('ministries')
      .select('id, name, name_ar')
      .eq('church_id', user.profile.church_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('groups')
      .select('id, name, name_ar')
      .eq('church_id', user.profile.church_id)
      .eq('is_active', true)
      .order('name'),
  ])

  const events = eventsResult.data || []
  const nextCursor = events.length === PAGE_SIZE ? events[events.length - 1].starts_at : null

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

      <EventsPageClient
        initialEvents={events as any}
        initialCursor={nextCursor}
        isAdmin={admin}
        upcoming={!admin}
        ministries={(ministriesResult.data || []) as any}
        groups={(groupsResult.data || []) as any}
      />
    </div>
  )
}
