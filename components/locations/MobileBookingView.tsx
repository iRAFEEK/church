'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, CalendarOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { MobileDateStrip } from './MobileDateStrip'
import { LocationFilterPills } from './LocationFilterPills'
import { AgendaBookingCard } from './AgendaBookingCard'
import { NewBookingModal } from './NewBookingModal'
import { BookingDetailModal } from './BookingDetailModal'

import type { LocationBookingWithDetails } from '@/types'

type MobileBookingViewProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  currentUserId: string
  isSuperAdmin: boolean
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function MobileBookingView({
  locations,
  currentUserId,
  isSuperAdmin,
}: MobileBookingViewProps) {
  const t = useTranslations('bookings')

  const isAr =
    typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? 'ar').startsWith('ar')
      : true

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<LocationBookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [detailBooking, setDetailBooking] = useState<LocationBookingWithDetails | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchBookings = useCallback(
    async (date: Date, locationId: string | null, signal?: AbortSignal) => {
      setLoading(true)
      const dateStr = toDateString(date)
      const startDate = `${dateStr}T00:00:00`
      const endDate = `${dateStr}T23:59:59`

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
    fetchBookings(selectedDate, selectedLocationId, controller.signal)
    return () => controller.abort()
  }, [selectedDate, selectedLocationId, fetchBookings])

  const handleCreated = () => {
    fetchBookings(selectedDate, selectedLocationId)
  }

  const handleCancelled = () => {
    setDetailOpen(false)
    setDetailBooking(null)
    fetchBookings(selectedDate, selectedLocationId)
  }

  const handleBookingTap = (booking: LocationBookingWithDetails) => {
    setDetailBooking(booking)
    setDetailOpen(true)
  }

  // Sort bookings by start time
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )

  return (
    <div className="space-y-3 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2">
        <h1 className="text-xl font-semibold text-zinc-900">{t('pageTitle')}</h1>
        <Button
          size="sm"
          className="h-10"
          onClick={() => setNewBookingOpen(true)}
        >
          <Plus className="h-4 w-4 me-1" />
          {t('newBooking')}
        </Button>
      </div>

      {/* Location filter pills */}
      <LocationFilterPills
        locations={locations}
        selectedLocationId={selectedLocationId}
        onSelect={setSelectedLocationId}
        isAr={isAr}
      />

      {/* Date strip */}
      <MobileDateStrip
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        isAr={isAr}
      />

      {/* Date label */}
      <div className="px-4">
        <p className="text-sm font-medium text-zinc-500">
          {selectedDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Agenda list */}
      <div className="px-4 space-y-2">
        {loading ? (
          // Skeleton cards
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : sortedBookings.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <CalendarOff className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">
              {t('emptyDayMessage')}
            </h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-[260px]">
              {t('tapToBook')}
            </p>
            <Button size="sm" onClick={() => setNewBookingOpen(true)}>
              <Plus className="h-4 w-4 me-1.5" />
              {t('emptyDayAction')}
            </Button>
          </div>
        ) : (
          sortedBookings.map((booking) => (
            <AgendaBookingCard
              key={booking.id}
              booking={booking}
              currentUserId={currentUserId}
              isAr={isAr}
              onTap={handleBookingTap}
            />
          ))
        )}
      </div>

      {/* New Booking Modal (Sheet on mobile) */}
      <NewBookingModal
        locations={locations}
        prefilledLocationId={selectedLocationId ?? locations[0]?.id}
        prefilledDate={toDateString(selectedDate)}
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        onCreated={handleCreated}
        canSetPublic={isSuperAdmin}
      />

      {/* Booking Detail Modal (Sheet on mobile) */}
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
