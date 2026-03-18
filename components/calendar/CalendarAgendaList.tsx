'use client'

import { useTranslations, useLocale } from 'next-intl'
import { CalendarOff, CalendarCheck, Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { CalendarEventCard } from './CalendarEventCard'
import type { CalendarItem, CalendarItemType } from '@/types'

type CalendarAgendaListProps = {
  date: string | null
  items: CalendarItem[]
  activeFilters: Set<CalendarItemType>
}

function formatDateHeading(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function CalendarAgendaList({ date, items, activeFilters }: CalendarAgendaListProps) {
  const t = useTranslations('calendar')
  const locale = useLocale()

  if (date) {
    // Show items for selected date
    const dayItems = items.filter(item => item.date === date && activeFilters.has(item.type))

    return (
      <div className="mt-3 border-t pt-3">
        <p className="text-sm font-semibold text-zinc-900 mb-2.5 px-1">
          {formatDateHeading(date, locale)}
        </p>
        {dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
              <CalendarOff className="h-7 w-7 text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">
              {t('nothingScheduled')}
            </h3>
            <p className="text-xs text-zinc-500 mb-4 max-w-[240px]">
              {t('emptyDay.body')}
            </p>
            <Button asChild size="sm" className="h-11 gap-1.5">
              <Link href={`/admin/events/new?date=${date}`}>
                <Plus className="h-4 w-4" />
                {t('addEvent')}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {dayItems.map(item => (
              <CalendarEventCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // No date selected — show upcoming items grouped by date
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const upcoming = items
    .filter(item => item.date >= todayStr && activeFilters.has(item.type))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
    .slice(0, 10)

  // Group by date
  const grouped = new Map<string, CalendarItem[]>()
  for (const item of upcoming) {
    const existing = grouped.get(item.date)
    if (existing) existing.push(item)
    else grouped.set(item.date, [item])
  }

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-sm font-semibold text-zinc-900 mb-2.5 px-1">
        {t('upcoming')}
      </p>
      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
            <CalendarCheck className="h-7 w-7 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">
            {t('noUpcoming')}
          </h3>
          <p className="text-xs text-zinc-500 mb-4 max-w-[240px]">
            {t('emptyMonth.body')}
          </p>
          <Button asChild size="sm" className="h-11 gap-1.5">
            <Link href="/admin/events/new">
              <Plus className="h-4 w-4" />
              {t('addEvent')}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([dateStr, dateItems]) => (
            <div key={dateStr}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
                {formatDateHeading(dateStr, locale)}
              </p>
              <div className="space-y-2">
                {dateItems.map(item => (
                  <CalendarEventCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
