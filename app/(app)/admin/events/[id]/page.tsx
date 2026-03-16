import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventRegistrations } from '@/components/events/EventRegistrations'
import { InlineStaffingManager } from '@/components/events/InlineStaffingManager'
import { EventRunOfShow } from '@/components/events/EventRunOfShow'
import { EventDeleteButton } from '@/components/events/EventDeleteButton'
import { EventServiceRequests } from '@/components/events/EventServiceRequests'
import { getTranslations, getLocale } from 'next-intl/server'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const t = await getTranslations('events')
  const locale = await getLocale()
  const isRTL = locale.startsWith('ar')
  const supabase = await createClient()

  const [{ data: event }, { count: registrationCount }] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, status')
      .eq('id', id)
      .eq('church_id', user.profile.church_id)
      .single(),
    supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .neq('status', 'cancelled'),
  ])

  if (!event) notFound()

  const isFull = event.capacity != null && (registrationCount ?? 0) >= event.capacity

  const title = isRTL ? (event.title_ar || event.title) : event.title
  const description = isRTL ? (event.description_ar || event.description) : event.description

  const startDate = new Date(event.starts_at)
  const dateStr = startDate.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = startDate.toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-zinc-100 text-zinc-800',
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={statusColors[event.status] || ''}>
              {t(`status_${event.status}`)}
            </Badge>
            <Badge variant="secondary">{t(`type_${event.event_type}`)}</Badge>
            {isFull && (
              <Badge variant="destructive">{t('eventFull')}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/admin/events/${id}/edit`}>
            <Button variant="outline" className="h-11">{t('editEvent')}</Button>
          </Link>
          <EventDeleteButton eventId={id} eventTitle={title} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {dateStr}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {timeStr}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}
          {event.capacity != null && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span dir="ltr">{registrationCount ?? 0}/{event.capacity}</span>
              {t('registered')}
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm">{description}</p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('runOfShow')}</h2>
        <Suspense fallback={<SectionSkeleton />}>
          <EventRunOfShow eventId={id} />
        </Suspense>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('staffing')}</h2>
        <InlineStaffingManager eventId={id} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('serviceRequests')}</h2>
        <EventServiceRequests eventId={id} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('registrations')}</h2>
        <Suspense fallback={<SectionSkeleton />}>
          <EventRegistrations eventId={id} />
        </Suspense>
      </div>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-zinc-200 rounded w-1/3" />
      <div className="h-20 bg-zinc-100 rounded-lg" />
    </div>
  )
}
