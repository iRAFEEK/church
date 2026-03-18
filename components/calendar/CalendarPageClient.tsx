'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CALENDAR_TYPE_COLORS } from '@/lib/design/tokens'
import { CalendarDesktopGrid } from './CalendarDesktopGrid'
import { CalendarMiniMonth } from './CalendarMiniMonth'
import { CalendarAgendaList } from './CalendarAgendaList'
import { CalendarDayView } from './CalendarDayView'
import type { CalendarItem, CalendarItemType } from '@/types'

type CalendarPageClientProps = {
  initialItems: CalendarItem[]
  initialMonth: string // YYYY-MM-DD (first day of month)
}

const ALL_TYPES: CalendarItemType[] = ['event', 'serving', 'gathering']

function getMonthRange(date: Date): { start: string; end: string } {
  const y = date.getFullYear()
  const m = date.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  return {
    start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    end: `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

function formatMonthYear(date: Date, locale: string): string {
  return date.toLocaleDateString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export function CalendarPageClient({ initialItems, initialMonth }: CalendarPageClientProps) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const [currentMonth, setCurrentMonth] = useState(() => new Date(initialMonth + 'T12:00:00'))
  const [items, setItems] = useState(initialItems)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDayView, setShowDayView] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<CalendarItemType>>(() => new Set(ALL_TYPES))
  const abortRef = useRef<AbortController | null>(null)

  const fetchMonth = useCallback(async (date: Date) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    const { start, end } = getMonthRange(date)

    try {
      const res = await fetch(`/api/calendar?start=${start}&end=${end}`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setItems(data.items)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error(t('error.load'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const navigateMonth = useCallback((direction: 'prev' | 'next' | 'today') => {
    let newDate: Date
    if (direction === 'today') {
      newDate = new Date()
    } else if (direction === 'prev') {
      newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    } else {
      newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    }
    setCurrentMonth(newDate)
    setSelectedDate(null)
    setShowDayView(false)
    fetchMonth(newDate)
  }, [currentMonth, fetchMonth])

  const toggleFilter = useCallback((type: CalendarItemType) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        if (next.size > 1) next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date)
    setShowDayView(true)
  }, [])

  const handleBackToMonth = useCallback(() => {
    setShowDayView(false)
  }, [])

  const handleNavigateDay = useCallback((direction: 'prev' | 'next') => {
    if (!selectedDate) return
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1))
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setSelectedDate(newDate)
  }, [selectedDate])

  const filterLabels: Record<CalendarItemType, string> = {
    event: t('events'),
    serving: t('serving'),
    gathering: t('gatherings'),
  }

  // ── Day View ──────────────────────────────────────────────
  if (showDayView && selectedDate) {
    return (
      <div className="space-y-3">
        {/* Filter toggles in day view too */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ALL_TYPES.map(type => {
            const active = activeFilters.has(type)
            const colors = CALENDAR_TYPE_COLORS[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleFilter(type)}
                aria-pressed={active}
                className={`
                  inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-medium
                  transition-all border shrink-0 min-h-[44px]
                  ${active
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                  }
                `}
              >
                <span className={`h-2 w-2 rounded-full ${active ? colors.dot : 'bg-zinc-300'}`} />
                {filterLabels[type]}
              </button>
            )
          })}
        </div>

        <CalendarDayView
          date={selectedDate}
          items={items}
          activeFilters={activeFilters}
          onBack={handleBackToMonth}
          onNavigateDay={handleNavigateDay}
        />
      </div>
    )
  }

  // ── Month View ────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => navigateMonth('prev')}
            aria-label={t('previousMonth')}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[140px] text-center">
            {formatMonthYear(currentMonth, locale)}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => navigateMonth('next')}
            aria-label={t('nextMonth')}
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => navigateMonth('today')}
          >
            {t('today')}
          </Button>
          <Button asChild size="sm" className="h-11 gap-1.5" aria-label={t('addEvent')}>
            <Link href="/admin/events/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('addEvent')}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter toggles */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {ALL_TYPES.map(type => {
          const active = activeFilters.has(type)
          const colors = CALENDAR_TYPE_COLORS[type]
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleFilter(type)}
              aria-pressed={active}
              className={`
                inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-medium
                transition-all border shrink-0 min-h-[44px]
                ${active
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                }
              `}
            >
              <span className={`h-2 w-2 rounded-full ${active ? colors.dot : 'bg-zinc-300'}`} />
              {filterLabels[type]}
            </button>
          )
        })}
      </div>

      {/* Calendar content */}
      {isLoading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block">
            <div className="grid grid-cols-7 border-b border-zinc-200">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="py-2 flex justify-center">
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-s border-zinc-200">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[100px] border-b border-e border-zinc-200 p-1.5 bg-white">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-full mt-2 rounded" />
                  <Skeleton className="h-4 w-3/4 mt-1 rounded" />
                </div>
              ))}
            </div>
          </div>
          {/* Mobile skeleton */}
          <div className="md:hidden">
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-11 flex items-center justify-center">
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop: full grid with event chips */}
          <div className="hidden md:block">
            <CalendarDesktopGrid
              month={currentMonth}
              items={items}
              activeFilters={activeFilters}
              selectedDate={selectedDate}
              onDayClick={handleDayClick}
            />
          </div>

          {/* Mobile: mini calendar + agenda list */}
          <div className="md:hidden">
            <CalendarMiniMonth
              month={currentMonth}
              items={items}
              activeFilters={activeFilters}
              selectedDate={selectedDate}
              onDayClick={handleDayClick}
            />
            <CalendarAgendaList
              date={null}
              items={items}
              activeFilters={activeFilters}
            />
          </div>
        </>
      )}
    </div>
  )
}
