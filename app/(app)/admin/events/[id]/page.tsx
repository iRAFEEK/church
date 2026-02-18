import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EventRegistrations } from '@/components/events/EventRegistrations'
import { getTranslations, getLocale } from 'next-intl/server'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('events')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={statusColors[event.status] || ''}>
              {t(`status_${event.status}`)}
            </Badge>
            <Badge variant="secondary">{t(`type_${event.event_type}`)}</Badge>
          </div>
        </div>
        <Link href={`/admin/events/${id}/edit`}>
          <Button variant="outline">{t('editEvent')}</Button>
        </Link>
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
          {event.capacity && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {t('capacityLabel')}: {event.capacity}
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm">{description}</p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('registrations')}</h2>
        <EventRegistrations eventId={id} />
      </div>
    </div>
  )
}
