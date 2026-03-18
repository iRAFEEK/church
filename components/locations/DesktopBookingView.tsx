'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarOff,
  MapPin,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { NewBookingModal } from './NewBookingModal'
import { BookingDetailModal } from './BookingDetailModal'

import { cn } from '@/lib/utils'
import type { LocationBookingWithDetails } from '@/types'

type DesktopBookingViewProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  currentUserId: string
  isSuperAdmin: boolean
}

const HOUR_HEIGHT = 48
const START_HOUR = 6
const END_HOUR = 22

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  // Start on Sunday
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function DesktopBookingView({
  locations,
  currentUserId,
  isSuperAdmin,
}: DesktopBookingViewProps) {
  const t = useTranslations('bookings')

  const isAr =
    typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? 'ar').startsWith('ar')
      : true

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<LocationBookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState<string>('')
  const [prefilledHour, setPrefilledHour] = useState<number | undefined>()
  const [detailBooking, setDetailBooking] = useState<LocationBookingWithDetails | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const today = useMemo(() => new Date(), [])

  // Generate 7 days of the week
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [weekStart])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d
  }, [weekStart])

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  )

  const fetchBookings = useCallback(
    async (start: Date, end: Date, locationId: string | null, signal?: AbortSignal) => {
      setLoading(true)
      const startDate = `${toDateString(start)}T00:00:00`
      const endDate = `${toDateString(end)}T23:59:59`

      let url = `/api/bookings?start_date=${startDate}&end_date=${endDate}`
      if (locationId) {
        url += `&location_id=${locationId}`
      }

      try {
        const res = await fetch(url, { signal })
        if (!res.ok) throw new Error('Failed to load')
        const json = await res.json()
        setBookings(json.data ?? [])
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setBookings([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchBookings(weekStart, weekEnd, selectedLocationId, controller.signal)
    return () => controller.abort()
  }, [weekStart, weekEnd, selectedLocationId, fetchBookings])

  const goToPrevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const goToNextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const goToToday = () => {
    setWeekStart(getWeekStart(new Date()))
  }

  const handleCellClick = (day: Date, hour: number) => {
    setPrefilledDate(toDateString(day))
    setPrefilledHour(hour)
    setNewBookingOpen(true)
  }

  const handleBookingClick = (booking: LocationBookingWithDetails) => {
    setDetailBooking(booking)
    setDetailOpen(true)
  }

  const handleCreated = () => {
    fetchBookings(weekStart, weekEnd, selectedLocationId)
  }

  const handleCancelled = () => {
    setDetailOpen(false)
    setDetailBooking(null)
    fetchBookings(weekStart, weekEnd, selectedLocationId)
  }

  // Group bookings by day
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, LocationBookingWithDetails[]>()
    for (const b of bookings) {
      const dayKey = toDateString(new Date(b.starts_at))
      if (!map.has(dayKey)) map.set(dayKey, [])
      map.get(dayKey)!.push(b)
    }
    return map
  }, [bookings])

  // Today's summary stats
  const todayStr = toDateString(today)
  const todayBookings = bookingsByDay.get(todayStr) ?? []

  const weekRangeLabel = isAr
    ? `${weekStart.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-e border-zinc-200 p-4 space-y-6 overflow-y-auto">
        {/* Location filter */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {t('location')}
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedLocationId(null)}
              className={cn(
                'w-full text-start text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2',
                selectedLocationId === null
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-zinc-700 hover:bg-zinc-50'
              )}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              {t('allLocations')}
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocationId(loc.id)}
                className={cn(
                  'w-full text-start text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2',
                  selectedLocationId === loc.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-zinc-700 hover:bg-zinc-50'
                )}
              >
                <MapPin className="h-4 w-4 shrink-0" />
                {isAr && loc.name_ar ? loc.name_ar : loc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Today's summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {t('todaySummary')}
          </h3>
          <div className="rounded-xl bg-zinc-50 p-3 space-y-1.5">
            <p className="text-2xl font-bold text-zinc-900 tabular-nums" dir="ltr">
              {todayBookings.length}
            </p>
            <p className="text-xs text-zinc-500">{t('bookingsCount')}</p>
          </div>
        </div>
      </div>

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Week header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={goToPrevWeek}
              aria-label={t('selectDate')}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={goToNextWeek}
              aria-label={t('selectDate')}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <span className="text-sm font-semibold text-zinc-900 ms-2">{weekRangeLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={goToToday}>
              {t('today')}
            </Button>
            <Button
              size="sm"
              className="h-9"
              onClick={() => {
                setPrefilledDate(toDateString(today))
                setPrefilledHour(undefined)
                setNewBookingOpen(true)
              }}
            >
              <Plus className="h-4 w-4 me-1" />
              {t('newBooking')}
            </Button>
          </div>
        </div>

        {/* Week grid */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            // Grid skeleton
            <div className="p-4 space-y-2">
              <div className="grid grid-cols-8 gap-1">
                <div className="w-14" />
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-8 gap-1" style={{ height: HOUR_HEIGHT }}>
                  <Skeleton className="w-14 h-4 mt-1" />
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-full rounded opacity-30" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div dir="ltr" className="min-w-[700px]">
              {/* Day column headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-200 sticky top-0 bg-white z-10">
                <div />
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, today)
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'text-center py-2 border-s border-zinc-100',
                        isToday && 'bg-primary/5'
                      )}
                    >
                      <p className="text-xs text-zinc-500">
                        {day.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' })}
                      </p>
                      <p
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          isToday ? 'text-primary' : 'text-zinc-900'
                        )}
                      >
                        {day.getDate()}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Time grid */}
              <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
                {/* Hour rows */}
                {hours.map((hour) => {
                  const label = new Date(2000, 0, 1, hour).toLocaleTimeString(
                    isAr ? 'ar-EG' : 'en-US',
                    { hour: 'numeric', hour12: true }
                  )
                  return (
                    <div
                      key={hour}
                      className="absolute w-full grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-50"
                      style={{
                        top: (hour - START_HOUR) * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                      }}
                    >
                      <span className="text-[10px] text-zinc-400 ps-2 pt-0.5 select-none">
                        {label}
                      </span>
                      {weekDays.map((day) => {
                        const isToday = isSameDay(day, today)
                        return (
                          <button
                            key={`${day.toISOString()}-${hour}`}
                            type="button"
                            className={cn(
                              'border-s border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer',
                              isToday && 'bg-primary/[0.02]'
                            )}
                            onClick={() => handleCellClick(day, hour)}
                            aria-label={`${label} ${day.toLocaleDateString()}`}
                          />
                        )
                      })}
                    </div>
                  )
                })}

                {/* Booking blocks overlay */}
                {weekDays.map((day, dayIndex) => {
                  const dayKey = toDateString(day)
                  const dayBookings = bookingsByDay.get(dayKey) ?? []

                  return dayBookings.map((booking) => {
                    const start = new Date(booking.starts_at)
                    const end = new Date(booking.ends_at)
                    const startMinutes = start.getHours() * 60 + start.getMinutes()
                    const endMinutes = end.getHours() * 60 + end.getMinutes()
                    const top = (startMinutes - START_HOUR * 60) * (HOUR_HEIGHT / 60)
                    const height = Math.max(
                      (endMinutes - startMinutes) * (HOUR_HEIGHT / 60),
                      20
                    )
                    const isOwn = booking.booked_by === currentUserId
                    const title =
                      isAr && booking.title_ar ? booking.title_ar : booking.title

                    // Calculate left position based on column
                    // First column is 60px (time labels), then 7 equal columns
                    const colWidth = `calc((100% - 60px) / 7)`
                    const colLeft = `calc(60px + ${dayIndex} * (100% - 60px) / 7 + 2px)`
                    const blockWidth = `calc((100% - 60px) / 7 - 4px)`

                    return (
                      <button
                        key={booking.id}
                        type="button"
                        className={cn(
                          'absolute rounded px-1.5 py-0.5 overflow-hidden cursor-pointer',
                          'hover:opacity-90 transition-opacity text-start',
                          isOwn
                            ? 'bg-emerald-100 border border-emerald-300 text-emerald-900'
                            : 'bg-primary/10 border border-primary/20 text-primary'
                        )}
                        style={{
                          top: Math.max(top, 0),
                          height,
                          left: colLeft,
                          width: blockWidth,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBookingClick(booking)
                        }}
                      >
                        <p className="text-xs font-medium truncate" dir="auto">
                          {title}
                        </p>
                        {height > 28 && (
                          <p className="text-[10px] opacity-70" dir="ltr">
                            {new Date(booking.starts_at).toLocaleTimeString(
                              isAr ? 'ar-EG' : 'en-US',
                              { hour: 'numeric', minute: '2-digit' }
                            )}
                          </p>
                        )}
                      </button>
                    )
                  })
                })}
              </div>

              {/* Empty week message */}
              {bookings.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 48 }}>
                  <div className="flex flex-col items-center text-center px-4 bg-white/80 rounded-xl p-6">
                    <CalendarOff className="h-8 w-8 text-zinc-400 mb-2" />
                    <p className="text-sm text-zinc-500">{t('noBookingsWeek')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Booking Modal (Dialog on desktop) */}
      <NewBookingModal
        locations={locations}
        prefilledLocationId={selectedLocationId ?? locations[0]?.id}
        prefilledDate={prefilledDate}
        prefilledHour={prefilledHour}
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        onCreated={handleCreated}
        canSetPublic={isSuperAdmin}
      />

      {/* Booking Detail Modal (Dialog on desktop) */}
      <BookingDetailModal
        booking={detailBooking}
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCancelled={handleCancelled}
      />
    </div>
  )
}
