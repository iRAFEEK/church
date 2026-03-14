'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Plus } from 'lucide-react'

interface MinistryEvent {
  id: string
  title: string
  title_ar: string | null
  event_type: string
  starts_at: string
  ends_at: string | null
  location: string | null
  status: string
}

interface MinistryEventsListProps {
  ministryId: string
}

export function MinistryEventsList({ ministryId }: MinistryEventsListProps) {
  const t = useTranslations('ministries')
  const te = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  const [upcoming, setUpcoming] = useState<MinistryEvent[]>([])
  const [recent, setRecent] = useState<MinistryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/ministries/${ministryId}/events`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (!controller.signal.aborted) {
          setUpcoming(d.data?.upcoming || [])
          setRecent(d.data?.recent || [])
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[MinistryEventsList] Failed to fetch:', e)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [ministryId])

  if (loading) return <div className="text-sm text-zinc-400 py-4">{te('loading')}</div>

  const hasEvents = upcoming.length > 0 || recent.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('events')}</h2>
        <Link href={`/admin/events/new?ministry_id=${ministryId}`}>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 me-1" />
            {t('createEvent')}
          </Button>
        </Link>
      </div>

      {!hasEvents ? (
        <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
          {t('noEvents')}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2">{t('upcomingEvents')}</p>
              <div className="space-y-2">
                {upcoming.map(event => (
                  <EventCard key={event.id} event={event} isRTL={isRTL} te={te} />
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2">{t('recentEvents')}</p>
              <div className="space-y-2">
                {recent.map(event => (
                  <EventCard key={event.id} event={event} isRTL={isRTL} te={te} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EventCard({ event, isRTL, te }: { event: MinistryEvent; isRTL: boolean; te: ReturnType<typeof useTranslations> }) {
  const title = isRTL ? (event.title_ar || event.title) : event.title
  const date = new Date(event.starts_at)

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-zinc-100 text-zinc-800',
  }

  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Calendar className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{title}</p>
        <p className="text-xs text-zinc-500">
          {date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="secondary" className="text-xs">{te(`type_${event.event_type}`)}</Badge>
        <Badge variant="outline" className={`text-xs ${statusColors[event.status] || ''}`}>
          {te(`status_${event.status}`)}
        </Badge>
      </div>
    </Link>
  )
}
