'use client'

import { useTranslations, useLocale } from 'next-intl'

import { CALENDAR_TYPE_COLORS } from '@/lib/design/tokens'
import type { CalendarItem, CalendarItemType } from '@/types'

type CalendarDesktopGridProps = {
  month: Date
  items: CalendarItem[]
  activeFilters: Set<CalendarItemType>
  selectedDate: string | null
  onDayClick: (date: string) => void
}

type DayCell = {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

const MAX_CHIPS = 2

function getMonthGrid(year: number, month: number): DayCell[] {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()

  const cells: DayCell[] = []

  // Leading days from previous month
  if (startDow > 0) {
    const prevLastDay = new Date(year, month, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLastDay - i
      const m = month === 0 ? 12 : month
      const y = month === 0 ? year - 1 : year
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === todayStr })
    }
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === todayStr })
  }

  // Trailing days
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2
      const y = month + 2 > 12 ? year + 1 : year
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === todayStr })
    }
  }

  return cells
}

function getItemsForDate(date: string, items: CalendarItem[], activeFilters: Set<CalendarItemType>): CalendarItem[] {
  return items.filter(item => item.date === date && activeFilters.has(item.type))
}

export function CalendarDesktopGrid({ month, items, activeFilters, selectedDate, onDayClick }: CalendarDesktopGridProps) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const cells = getMonthGrid(year, monthIndex)

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

  return (
    <div>
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-zinc-200">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {t(`dayNames.${day}`)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 border-s border-zinc-200">
        {cells.map(cell => {
          const dayItems = getItemsForDate(cell.date, items, activeFilters)
          const visibleItems = dayItems.slice(0, MAX_CHIPS)
          const overflowCount = dayItems.length - MAX_CHIPS
          const isSelected = selectedDate === cell.date

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onDayClick(cell.date)}
              className={`
                min-h-[100px] border-b border-e border-zinc-200 p-1.5 flex flex-col text-start
                transition-colors hover:bg-zinc-50/80
                ${!cell.isCurrentMonth ? 'opacity-40 bg-zinc-50/50' : 'bg-white'}
                ${isSelected ? 'bg-primary/5' : ''}
              `}
            >
              {/* Day number */}
              <div className="mb-1">
                <span
                  dir="ltr"
                  className={`
                    inline-flex items-center justify-center text-xs font-medium leading-none
                    ${cell.isToday
                      ? 'h-6 w-6 rounded-full bg-primary text-white font-semibold'
                      : isSelected
                        ? 'h-6 w-6 rounded-full bg-zinc-200 text-zinc-900 font-semibold'
                        : 'text-zinc-700'
                    }
                  `}
                >
                  {cell.day}
                </span>
              </div>

              {/* Event chips */}
              <div className="flex-1 space-y-0.5 min-w-0">
                {visibleItems.map(item => {
                  const colors = CALENDAR_TYPE_COLORS[item.type]
                  const title = isAr && item.title_ar ? item.title_ar : item.title
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${colors.bg} ${colors.text} truncate`}
                    >
                      <span className={`w-1 h-3 rounded-full shrink-0 ${colors.dot}`} />
                      <span className="text-[11px] leading-tight truncate font-medium">{title}</span>
                    </div>
                  )
                })}
                {overflowCount > 0 && (
                  <span className="text-[11px] text-primary font-medium px-1 hover:underline">
                    +{overflowCount} {t('more')}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
