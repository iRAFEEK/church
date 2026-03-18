'use client'

import { useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { CALENDAR_TYPE_COLORS } from '@/lib/design/tokens'
import type { CalendarItem, CalendarItemType } from '@/types'

type CalendarDayViewProps = {
  date: string
  items: CalendarItem[]
  activeFilters: Set<CalendarItemType>
  onBack: () => void
  onNavigateDay?: (direction: 'prev' | 'next') => void
}

const HOUR_HEIGHT = 60 // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatDateHeading(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatHour(hour: number, locale: string): string {
  const d = new Date(2000, 0, 1, hour)
  return d.toLocaleTimeString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    hour12: true,
  })
}

/** Parse a time string into fractional hours (e.g., "14:30" → 14.5) */
function parseTimeToHours(timeStr: string | null): number | null {
  if (!timeStr) return null

  // HH:MM or HH:MM:SS format (serving slots)
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number)
    return h + m / 60
  }

  // ISO datetime
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return null
  return d.getHours() + d.getMinutes() / 60
}

type PositionedItem = CalendarItem & {
  topPx: number
  heightPx: number
  column: number
  totalColumns: number
}

function positionItems(items: CalendarItem[]): PositionedItem[] {
  // First pass: compute top/height for each item
  const withPosition = items.map(item => {
    const startHours = parseTimeToHours(item.starts_at)
    const endHours = parseTimeToHours(item.ends_at)

    const top = startHours !== null ? startHours * HOUR_HEIGHT : 8 * HOUR_HEIGHT
    const minHeight = 30
    let height: number
    if (startHours !== null && endHours !== null && endHours > startHours) {
      height = Math.max((endHours - startHours) * HOUR_HEIGHT, minHeight)
    } else {
      height = HOUR_HEIGHT
    }

    return { ...item, topPx: top, heightPx: height, column: 0, totalColumns: 1 }
  })

  // Sort by top position, then by height descending (taller events first)
  withPosition.sort((a, b) => a.topPx - b.topPx || b.heightPx - a.heightPx)

  // Second pass: detect overlaps and assign columns
  // Group overlapping items into clusters
  const clusters: PositionedItem[][] = []
  for (const item of withPosition) {
    let placed = false
    for (const cluster of clusters) {
      const overlaps = cluster.some(c =>
        item.topPx < c.topPx + c.heightPx && item.topPx + item.heightPx > c.topPx
      )
      if (overlaps) {
        cluster.push(item)
        placed = true
        break
      }
    }
    if (!placed) {
      clusters.push([item])
    }
  }

  // Assign columns within each cluster
  for (const cluster of clusters) {
    const columns: PositionedItem[][] = []
    for (const item of cluster) {
      let col = 0
      while (col < columns.length) {
        const canFit = !columns[col].some(c =>
          item.topPx < c.topPx + c.heightPx && item.topPx + item.heightPx > c.topPx
        )
        if (canFit) break
        col++
      }
      if (col >= columns.length) columns.push([])
      columns[col].push(item)
      item.column = col
    }
    for (const item of cluster) {
      item.totalColumns = columns.length
    }
  }

  return withPosition
}

export function CalendarDayView({ date, items, activeFilters, onBack, onNavigateDay }: CalendarDayViewProps) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const scrollRef = useRef<HTMLDivElement>(null)

  const dayItems = items.filter(item => item.date === date && activeFilters.has(item.type))
  const positioned = positionItems(dayItems)

  // Scroll to 7am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
    }
  }, [date])

  const typeLabels: Record<CalendarItemType, string> = {
    event: t('event'),
    serving: t('servingSlot'),
    gathering: t('gatheringMeeting'),
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={onBack}
            aria-label={t('backToMonth')}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          {onNavigateDay && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => onNavigateDay('prev')}
              aria-label={t('previousDay')}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
          )}
          <h2 className="text-base font-semibold truncate">
            {formatDateHeading(date, locale)}
          </h2>
          {onNavigateDay && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => onNavigateDay('next')}
              aria-label={t('nextDay')}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          )}
        </div>
        <Button asChild size="sm" className="h-11 gap-1.5" aria-label={t('addEvent')}>
          <Link href={`/admin/events/new?date=${date}`}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('addEvent')}</span>
          </Link>
        </Button>
      </div>

      {/* Hourly timeline */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto mt-2 relative min-h-0"
      >
        <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour grid lines + labels */}
          {HOURS.map(hour => (
            <div
              key={hour}
              className="absolute inset-x-0 border-t border-zinc-100"
              style={{ top: hour * HOUR_HEIGHT }}
            >
              <span
                dir="ltr"
                className="absolute text-xs text-muted-foreground leading-none -top-[6px] start-0 bg-white pe-1.5 ps-0.5"
              >
                {formatHour(hour, locale)}
              </span>
            </div>
          ))}

          {/* Current time indicator */}
          <CurrentTimeIndicator date={date} />

          {/* Event blocks */}
          <div className="absolute inset-y-0 start-12 end-1">
            {positioned.map(item => {
              const colors = CALENDAR_TYPE_COLORS[item.type]
              const title = isAr && item.title_ar ? item.title_ar : item.title
              const startTime = item.starts_at ? formatTimeShort(item.starts_at, locale) : ''

              const href = item.type === 'event'
                ? `/admin/events/${item.id}`
                : item.type === 'serving'
                  ? `/admin/serving/slots/${item.id}`
                  : item.group_id ? `/groups/${item.group_id}` : '#'

              const widthPercent = 100 / item.totalColumns
              const leftPercent = item.column * widthPercent

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={href}
                  className={`
                    absolute rounded-md px-2 py-1 overflow-hidden
                    border-s-[3px] ${colors.border} ${colors.bg}
                    active:opacity-80 transition-opacity
                  `}
                  style={{
                    top: item.topPx,
                    height: item.heightPx,
                    minHeight: 28,
                    insetInlineStart: `${leftPercent}%`,
                    width: `calc(${widthPercent}% - 4px)`,
                  }}
                >
                  <p className={`text-xs font-medium ${colors.text} truncate leading-tight`}>
                    {title}
                  </p>
                  {item.heightPx >= 40 && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      <span dir="ltr">{startTime}</span>
                      {item.location && ` · ${item.location}`}
                    </p>
                  )}
                  {item.heightPx >= 56 && (
                    <span className={`text-xs ${colors.text} opacity-70`}>
                      {typeLabels[item.type]}
                      {item.type === 'serving' && item.area_name && ` · ${isAr && item.area_name_ar ? item.area_name_ar : item.area_name}`}
                      {item.type === 'gathering' && item.group_name && ` · ${isAr && item.group_name_ar ? item.group_name_ar : item.group_name}`}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Red line showing current time */
function CurrentTimeIndicator({ date }: { date: string }) {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (date !== todayStr) return null

  const hours = now.getHours() + now.getMinutes() / 60
  const top = hours * HOUR_HEIGHT

  return (
    <div
      className="absolute inset-x-0 z-10 pointer-events-none"
      style={{ top }}
    >
      <div className="flex items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ms-1" />
        <div className="flex-1 h-px bg-red-500" />
      </div>
    </div>
  )
}

function formatTimeShort(timeStr: string, locale: string): string {
  // HH:MM format
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    const [h, m] = timeStr.split(':')
    const d = new Date(2000, 0, 1, parseInt(h), parseInt(m))
    return d.toLocaleTimeString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  // ISO datetime
  const d = new Date(timeStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
