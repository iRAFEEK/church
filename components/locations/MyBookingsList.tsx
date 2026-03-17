"use client"

import { useState, useEffect } from 'react'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { CalendarOff, Clock } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

import { BookingCard } from '@/components/locations/BookingCard'

type BookingWithLocation = {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'cancelled'
  location: { id: string; name: string; name_ar: string | null } | null
}

type MyBookingsListProps = {
  initialBookings: BookingWithLocation[]
  currentUserId: string
}

export function MyBookingsList({ initialBookings, currentUserId }: MyBookingsListProps) {
  const t = useTranslations('bookings')

  const isAr = typeof document !== 'undefined'
    ? (document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? 'ar').startsWith('ar')
    : true

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [upcomingBookings] = useState<BookingWithLocation[]>(initialBookings)
  const [pastBookings, setPastBookings] = useState<BookingWithLocation[]>([])
  const [pastLoading, setPastLoading] = useState(false)
  const [pastLoaded, setPastLoaded] = useState(false)

  useEffect(() => {
    if (tab !== 'past' || pastLoaded) return

    const controller = new AbortController()
    setPastLoading(true)

    const now = new Date().toISOString()
    fetch(
      `/api/bookings?booked_by=${currentUserId}&start_date=2000-01-01&end_date=${now}&pageSize=25`,
      { signal: controller.signal }
    )
      .then(async res => {
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        setPastBookings(json.data ?? [])
        setPastLoaded(true)
      })
      .catch(error => {
        if (error instanceof Error && error.name === 'AbortError') return
        toast.error(t('toastError'))
      })
      .finally(() => setPastLoading(false))

    return () => controller.abort()
  }, [tab, pastLoaded, currentUserId, t])

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'upcoming' | 'past')}>
      <TabsList className="w-full h-11">
        <TabsTrigger value="upcoming" className="flex-1 h-9 text-base">
          {t('upcoming')}
        </TabsTrigger>
        <TabsTrigger value="past" className="flex-1 h-9 text-base">
          {t('past')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="mt-4 space-y-3">
        {upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarOff className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{t('emptyUpcomingTitle')}</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {t('emptyUpcomingBody')}
            </p>
            <Button asChild>
              <Link href="/bookings">{t('emptyUpcomingAction')}</Link>
            </Button>
          </div>
        ) : (
          upcomingBookings.map(booking => (
            <BookingCard key={booking.id} booking={booking} isAr={isAr} />
          ))
        )}
      </TabsContent>

      <TabsContent value="past" className="mt-4 space-y-3">
        {pastLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : pastBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">{t('emptyPastTitle')}</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {t('emptyPastBody')}
            </p>
          </div>
        ) : (
          pastBookings.map(booking => (
            <BookingCard key={booking.id} booking={booking} isAr={isAr} />
          ))
        )}
      </TabsContent>
    </Tabs>
  )
}
