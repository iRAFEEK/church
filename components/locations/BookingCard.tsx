"use client"

import Link from 'next/link'

import { useTranslations } from 'next-intl'
import { MapPin, Clock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { cn } from '@/lib/utils'

type BookingWithLocation = {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'cancelled'
  location: { id: string; name: string; name_ar: string | null } | null
}

type BookingCardProps = {
  booking: BookingWithLocation
  isAr: boolean
}

export function BookingCard({ booking, isAr }: BookingCardProps) {
  const t = useTranslations('bookings')

  const locationName = isAr && booking.location?.name_ar
    ? booking.location.name_ar
    : booking.location?.name ?? ''

  const bookingTitle = isAr && booking.title_ar
    ? booking.title_ar
    : booking.title

  const dateStr = new Date(booking.starts_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const startTime = new Date(booking.starts_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const endTime = new Date(booking.ends_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <Link href="/bookings">
      <Card className="hover:bg-muted/30 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate">{bookingTitle}</h3>
            <Badge
              variant="secondary"
              className={cn(
                'shrink-0 text-xs',
                booking.status === 'confirmed' && 'bg-emerald-100 text-emerald-700',
                booking.status === 'cancelled' && 'bg-zinc-100 text-zinc-500'
              )}
            >
              {t(booking.status)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs truncate">{locationName}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">
              {dateStr}
              <span className="mx-1">-</span>
              <span dir="ltr">{startTime} - {endTime}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
