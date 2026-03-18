'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type MobileDateStripProps = {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  isAr: boolean
}

function getDayAbbr(date: Date, isAr: boolean): string {
  return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' }).slice(0, 2)
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function MobileDateStrip({ selectedDate, onDateSelect, isAr }: MobileDateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const today = new Date()

  // Generate 7 days centered on selectedDate (3 before, selected, 3 after)
  const dates: Date[] = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }

  // Scroll selected chip into view on mount and when selection changes
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [selectedDate])

  return (
    <div
      ref={scrollRef}
      dir="ltr"
      className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 py-2"
    >
      {dates.map((date) => {
        const isSelected = isSameDay(date, selectedDate)
        const isToday = isSameDay(date, today)

        return (
          <button
            key={date.toISOString()}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            onClick={() => onDateSelect(new Date(date))}
            className={cn(
              'shrink-0 h-14 w-12 rounded-xl flex flex-col items-center justify-center transition-colors',
              isSelected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200'
            )}
          >
            <span className="text-[10px] font-medium leading-none mb-0.5">
              {getDayAbbr(date, isAr)}
            </span>
            <span className="text-lg font-bold leading-none tabular-nums" dir="ltr">
              {date.getDate()}
            </span>
            {isToday && !isSelected && (
              <span className="h-1 w-1 rounded-full bg-primary mt-0.5" />
            )}
          </button>
        )
      })}
    </div>
  )
}
