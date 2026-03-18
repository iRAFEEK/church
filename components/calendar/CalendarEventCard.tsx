'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin, Clock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { CALENDAR_TYPE_COLORS } from '@/lib/design/tokens'
import type { CalendarItem, CalendarItemType } from '@/types'

type CalendarEventCardProps = {
  item: CalendarItem
  onItemClick?: (item: CalendarItem) => void
}

function getDetailHref(item: CalendarItem): string {
  switch (item.type) {
    case 'event':
      return `/admin/events/${item.id}`
    case 'serving':
      return `/admin/serving/slots/${item.id}`
    case 'gathering':
      return item.group_id ? `/groups/${item.group_id}` : '#'
  }
}

function formatTime(timeStr: string | null, locale: string): string {
  if (!timeStr) return ''
  // Handle HH:MM format (serving slots)
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    const [h, m] = timeStr.split(':')
    const d = new Date()
    d.setHours(parseInt(h), parseInt(m))
    return d.toLocaleTimeString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  // Handle ISO datetime
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CalendarEventCard({ item, onItemClick }: CalendarEventCardProps) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const colors = CALENDAR_TYPE_COLORS[item.type]
  const href = getDetailHref(item)

  const typeLabels: Record<CalendarItemType, string> = {
    event: t('event'),
    serving: t('servingSlot'),
    gathering: t('gatheringMeeting'),
  }

  const title = isAr && item.title_ar ? item.title_ar : item.title
  const startTime = formatTime(item.starts_at, locale)
  const endTime = formatTime(item.ends_at, locale)
  const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : startTime || ''

  const location = item.location
  const subtitle = item.type === 'serving' && (isAr ? item.area_name_ar : item.area_name)
    ? `${isAr ? item.area_name_ar : item.area_name}`
    : item.type === 'gathering' && item.topic
      ? (isAr && item.topic_ar ? item.topic_ar : item.topic)
      : null

  return (
    <Link
      href={href}
      onClick={() => onItemClick?.(item)}
      className={`flex items-start gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg} active:opacity-80 transition-opacity`}
    >
      <div className={`w-1 self-stretch rounded-full ${colors.dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${colors.text} ${colors.border}`}>
            {typeLabels[item.type]}
          </Badge>
          {item.event_type && (
            <span className="text-xs text-muted-foreground">{item.event_type}</span>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-900 truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {timeRange && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span dir="ltr">{timeRange}</span>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
