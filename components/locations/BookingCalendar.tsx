"use client"

import { useState, useEffect, useCallback } from 'react'

import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Plus, CalendarOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

import { NewBookingSheet } from '@/components/locations/NewBookingSheet'
import { BookingDetailSheet } from '@/components/locations/BookingDetailSheet'

import { cn } from '@/lib/utils'
import type { LocationBookingWithDetails } from '@/types'

type BookingCalendarProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  currentUserId: string
  isSuperAdmin: boolean
}

const HOUR_HEIGHT = 60
const START_HOUR = 6
const END_HOUR = 22

function getLocale(): boolean {
  if (typeof document !== 'undefined') {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)
    const lang = cookieMatch ? cookieMatch[1] : 'ar'
    return lang.startsWith('ar')
  }
  return true
}

function formatDate(date: Date, isAr: boolean): string {
  return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(dateStr: string, isAr: boolean): string {
  return new Date(dateStr).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function BookingCalendar({ locations, currentUserId, isSuperAdmin }: BookingCalendarProps) {
  const t = useTranslations('bookings')
  const isAr = getLocale()

  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<LocationBookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Sheet states
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [prefilledHour, setPrefilledHour] = useState<number | undefined>()
  const [detailBooking, setDetailBooking] = useState<LocationBookingWithDetails | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchBookings = useCallback(async (locationId: string, date: Date, signal?: AbortSignal) => {
    if (!locationId) return

    setLoading(true)
    const dateStr = toDateString(date)
    // For day view, use start/end of the same day
    const startDate = `${dateStr}T00:00:00`
    const endDate = `${dateStr}T23:59:59`

    try {
      const res = await fetch(
        `/api/bookings?location_id=${locationId}&start_date=${startDate}&end_date=${endDate}`,
        { signal }
      )
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setBookings(json.data ?? [])
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchBookings(selectedLocationId, selectedDate, controller.signal)
    return () => controller.abort()
  }, [selectedLocationId, selectedDate, fetchBookings])

  const goToPrevDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }

  const goToNextDay = () => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      return d
    })
  }

  const handleHourTap = (hour: number) => {
    setPrefilledHour(hour)
    setNewBookingOpen(true)
  }

  const handleBookingTap = (booking: LocationBookingWithDetails) => {
    setDetailBooking(booking)
    setDetailOpen(true)
  }

  const handleCreated = () => {
    fetchBookings(selectedLocationId, selectedDate)
  }

  const handleCancelled = () => {
    setDetailOpen(false)
    setDetailBooking(null)
    fetchBookings(selectedLocationId, selectedDate)
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  return (
    <div className="space-y-4">
      {/* Location selector */}
      <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
        <SelectTrigger className="h-11 w-full text-base">
          <SelectValue placeholder={t('selectLocation')} />
        </SelectTrigger>
        <SelectContent>
          {locations.map(loc => (
            <SelectItem key={loc.id} value={loc.id} className="h-11 text-base">
              {isAr && loc.name_ar ? loc.name_ar : loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date navigator + New booking button */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={goToPrevDay}
          aria-label={t('selectDate')}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>

        <span className="text-sm font-medium text-center flex-1 truncate">
          {formatDate(selectedDate, isAr)}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={goToNextDay}
          aria-label={t('selectDate')}
        >
          <ChevronRight className="h-5 w-5 rtl:rotate-180" />
        </Button>

        <Button
          className="h-11 shrink-0"
          onClick={() => {
            setPrefilledHour(undefined)
            setNewBookingOpen(true)
          }}
        >
          <Plus className="h-4 w-4 me-1" />
          <span className="hidden sm:inline">{t('newBooking')}</span>
        </Button>
      </div>

      {/* Day view time grid */}
      {loading ? (
        <div className="border rounded-lg overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border-b last:border-b-0" style={{ height: HOUR_HEIGHT }}>
              <Skeleton className="h-4 w-12 shrink-0 mt-1" />
              <Skeleton className="h-8 flex-1 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden relative">
          {/* Hour rows (background) */}
          <div className="relative" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
            {hours.map(hour => {
              const label = new Date(2000, 0, 1, hour).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                hour: 'numeric',
                hour12: true,
              })
              return (
                <button
                  key={hour}
                  type="button"
                  className="absolute w-full flex items-start border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  style={{
                    top: (hour - START_HOUR) * HOUR_HEIGHT,
                    height: HOUR_HEIGHT,
                  }}
                  onClick={() => handleHourTap(hour)}
                  aria-label={`${label}`}
                >
                  <span
                    dir="ltr"
                    className="text-xs text-muted-foreground w-14 shrink-0 ps-2 pt-1 text-start"
                  >
                    {label}
                  </span>
                </button>
              )
            })}

            {/* Booking blocks */}
            {bookings.map(booking => {
              const start = new Date(booking.starts_at)
              const end = new Date(booking.ends_at)
              const startMinutes = start.getHours() * 60 + start.getMinutes()
              const endMinutes = end.getHours() * 60 + end.getMinutes()
              const top = (startMinutes - START_HOUR * 60) * (HOUR_HEIGHT / 60)
              const height = Math.max((endMinutes - startMinutes) * (HOUR_HEIGHT / 60), 24)
              const isOwn = booking.booked_by === currentUserId

              return (
                <button
                  key={booking.id}
                  type="button"
                  className={cn(
                    'absolute rounded-lg px-3 py-1 overflow-hidden cursor-pointer transition-opacity hover:opacity-90',
                    'border-s-4',
                    isOwn
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-primary bg-primary/10'
                  )}
                  style={{
                    top: Math.max(top, 0),
                    height,
                    insetInlineStart: 60,
                    insetInlineEnd: 8,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBookingTap(booking)
                  }}
                >
                  <p className="text-sm font-medium truncate text-start">
                    {isAr && booking.title_ar ? booking.title_ar : booking.title}
                  </p>
                  {height > 32 && (
                    <p className="text-xs text-muted-foreground text-start" dir="ltr">
                      {formatTime(booking.starts_at, isAr)} - {formatTime(booking.ends_at, isAr)}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Empty day message */}
          {bookings.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center text-center px-4">
                <CalendarOff className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{t('emptyDayMessage')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Booking Sheet */}
      <NewBookingSheet
        locations={locations}
        prefilledLocationId={selectedLocationId}
        prefilledDate={toDateString(selectedDate)}
        prefilledHour={prefilledHour}
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        onCreated={handleCreated}
        canSetPublic={isSuperAdmin}
      />

      {/* Booking Detail Sheet */}
      <BookingDetailSheet
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
