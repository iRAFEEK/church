'use client'

import { useTranslations } from 'next-intl'
import { MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocationBookingWithDetails } from '@/types'

type AgendaBookingCardProps = {
  booking: LocationBookingWithDetails
  currentUserId: string
  isAr: boolean
  onTap: (booking: LocationBookingWithDetails) => void
}

export function AgendaBookingCard({
  booking,
  currentUserId,
  isAr,
  onTap,
}: AgendaBookingCardProps) {
  const t = useTranslations('bookings')
  const isOwn = booking.booked_by === currentUserId

  const title = isAr && booking.title_ar ? booking.title_ar : booking.title

  const locationName =
    isAr && booking.location?.name_ar
      ? booking.location.name_ar
      : booking.location?.name ?? ''

  const startTime = new Date(booking.starts_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const endTime = new Date(booking.ends_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const bookerName = isAr
    ? [booking.booker?.first_name_ar, booking.booker?.last_name_ar].filter(Boolean).join(' ') ||
      [booking.booker?.first_name, booking.booker?.last_name].filter(Boolean).join(' ')
    : [booking.booker?.first_name, booking.booker?.last_name].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      onClick={() => onTap(booking)}
      className={cn(
        'w-full text-start rounded-xl border bg-white p-4 transition-colors active:bg-zinc-50',
        'border-s-4',
        isOwn ? 'border-s-emerald-500' : 'border-s-primary'
      )}
    >
      {/* Title */}
      <p className="text-sm font-semibold text-zinc-900 truncate">{title}</p>

      {/* Location */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <span className="text-xs text-zinc-500 truncate">{locationName}</span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1.5 mt-1">
        <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <span className="text-xs text-zinc-500" dir="ltr">
          {startTime} - {endTime}
        </span>
      </div>

      {/* Booker name - only show for other people's bookings */}
      {!isOwn && bookerName && (
        <p className="text-xs text-zinc-400 mt-1.5 truncate">{bookerName}</p>
      )}

      {/* "Your booking" indicator */}
      {isOwn && (
        <span className="inline-block text-xs text-emerald-600 font-medium mt-1.5">
          {t('yourBooking')}
        </span>
      )}
    </button>
  )
}
