'use client'

import { useTranslations } from 'next-intl'

import { CALENDAR_TYPE_COLORS } from '@/lib/design/tokens'
import type { CalendarItem, CalendarItemType } from '@/types'

type CalendarMiniMonthProps = {
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

function getMonthGrid(year: number, month: number): DayCell[] {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()

  const cells: DayCell[] = []

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

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === todayStr })
  }

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

function getTypesForDate(date: string, items: CalendarItem[], activeFilters: Set<CalendarItemType>): CalendarItemType[] {
  const types = new Set<CalendarItemType>()
  for (const item of items) {
    if (item.date === date && activeFilters.has(item.type)) {
      types.add(item.type)
    }
  }
  return Array.from(types)
}

export function CalendarMiniMonth({ month, items, activeFilters, selectedDate, onDayClick }: CalendarMiniMonthProps) {
  const t = useTranslations('calendar')
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const cells = getMonthGrid(year, monthIndex)

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

  return (
    <div>
      {/* Day name headers */}
      <div className="grid grid-cols-7">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5">
            {t(`dayNames.${day}`)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map(cell => {
          const types = getTypesForDate(cell.date, items, activeFilters)
          const isSelected = selectedDate === cell.date

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onDayClick(cell.date)}
              className={`
                h-11 flex flex-col items-center justify-center relative
                active:bg-zinc-100 transition-colors
                ${!cell.isCurrentMonth ? 'opacity-30' : ''}
              `}
            >
              {/* Day number with selection/today circle */}
              <span
                dir="ltr"
                className={`
                  inline-flex items-center justify-center text-xs leading-none
                  ${cell.isToday && isSelected
                    ? 'h-7 w-7 rounded-full bg-primary text-white font-bold ring-2 ring-primary/30'
                    : cell.isToday
                      ? 'h-7 w-7 rounded-full bg-primary text-white font-bold'
                      : isSelected
                        ? 'h-7 w-7 rounded-full bg-zinc-900 text-white font-semibold'
                        : 'font-medium text-zinc-700'
                  }
                `}
              >
                {cell.day}
              </span>

              {/* Activity dots */}
              {types.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {types.slice(0, 3).map(type => (
                    <span
                      key={type}
                      className={`h-1 w-1 rounded-full ${CALENDAR_TYPE_COLORS[type].dot}`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
