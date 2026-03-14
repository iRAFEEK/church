import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTranslations } from 'next-intl/server'
import { Plus, Copy } from 'lucide-react'
import { EventsPageClient } from '@/components/events/EventsPageClient'
import type { Ministry, Group } from '@/types'

const PAGE_SIZE = 20

export default async function EventsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('events')
  const supabase = await createClient()
  const admin = isAdmin(user.profile)
  const canManageEvents = user.resolvedPermissions.can_manage_events

  // Fetch initial events (include visibility for filtering), ministries, and groups in parallel
  let eventsQuery = supabase
    .from('events')
    .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, status, visibility, hide_from_non_invited')
    .eq('church_id', user.profile.church_id)
    .limit(PAGE_SIZE + 10) // fetch extra to account for filtered restricted events

  if (canManageEvents) {
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

  let events = eventsResult.data || []

  // Filter restricted events for non-admin users
  if (!canManageEvents) {
    const restrictedEventIds = events
      .filter((e) => e.visibility === 'restricted')
      .map((e) => e.id)

    if (restrictedEventIds.length > 0) {
      // Fetch visibility targets for restricted events
      const { data: targets } = await supabase
        .from('event_visibility_targets')
        .select('event_id, target_type, target_id')
        .in('event_id', restrictedEventIds)

      // Get user's ministry and group memberships
      const [ministryMemberships, groupMemberships] = await Promise.all([
        supabase
          .from('ministry_members')
          .select('ministry_id')
          .eq('profile_id', user.id)
          .eq('is_active', true),
        supabase
          .from('group_members')
          .select('group_id')
          .eq('profile_id', user.id)
          .eq('is_active', true),
      ])

      const userMinistryIds = new Set((ministryMemberships.data || []).map(m => m.ministry_id))
      const userGroupIds = new Set((groupMemberships.data || []).map(g => g.group_id))

      // Build set of events user is targeted for
      const targetsByEvent = new Map<string, { target_type: string; target_id: string }[]>()
      for (const t of targets || []) {
        if (!targetsByEvent.has(t.event_id)) targetsByEvent.set(t.event_id, [])
        targetsByEvent.get(t.event_id)!.push(t)
      }

      events = events.filter((e) => {
        if (e.visibility !== 'restricted') return true
        const eventTargets = targetsByEvent.get(e.id) || []
        const userIsTargeted = eventTargets.some(t =>
          (t.target_type === 'ministry' && userMinistryIds.has(t.target_id)) ||
          (t.target_type === 'group' && userGroupIds.has(t.target_id))
        )
        // If hide_from_non_invited, completely remove; otherwise keep but user won't be able to register
        if (e.hide_from_non_invited && !userIsTargeted) return false
        return true
      })
    }
  }

  // Trim to page size
  events = events.slice(0, PAGE_SIZE)
  const nextCursor = events.length === PAGE_SIZE ? events[events.length - 1].starts_at : null

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {canManageEvents ? t('adminPageTitle') : t('upcomingEvents')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {canManageEvents ? t('adminPageSubtitle') : t('upcomingEventsSubtitle')}
          </p>
        </div>
        {canManageEvents && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/admin/events/from-template">
              <Button variant="outline" className="w-full sm:w-auto">
                <Copy className="h-4 w-4 me-1" />
                {t('fromTemplate')}
              </Button>
            </Link>
            <Link href="/admin/events/new">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 me-1" />
                {t('newEvent')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      <EventsPageClient
        initialEvents={events}
        initialCursor={nextCursor}
        isAdmin={canManageEvents}
        upcoming={!canManageEvents}
        ministries={(ministriesResult.data || []) as Ministry[]}
        groups={(groupsResult.data || []) as Group[]}
      />
    </div>
  )
}
