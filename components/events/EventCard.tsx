'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EventCardProps {
  event: {
    id: string
    title: string
    title_ar: string
    description: string | null
    description_ar: string | null
    event_type: string
    starts_at: string
    ends_at: string | null
    location: string | null
    capacity: number | null
    is_public: boolean
    status: string
  }
  href: string
}

export function EventCard({ event, href }: EventCardProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const title = isRTL ? (event.title_ar || event.title) : event.title
  const description = isRTL ? (event.description_ar || event.description) : event.description

  const startDate = new Date(event.starts_at)
  const dateStr = startDate.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    weekday: 'short',
    month: 'short',
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
    <Link href={href} className="block">
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base line-clamp-1">{title}</h3>
          <Badge variant="outline" className={statusColors[event.status] || ''}>
            {t(`status_${event.status}`)}
          </Badge>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {dateStr}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {timeStr}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}
          {event.capacity && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {event.capacity}
            </span>
          )}
        </div>

        <div className="mt-2">
          <Badge variant="secondary" className="text-xs">
            {t(`type_${event.event_type}`)}
          </Badge>
        </div>
      </div>
    </Link>
  )
}
