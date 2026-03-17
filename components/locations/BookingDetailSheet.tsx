"use client"

import { useState } from 'react'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { MapPin, CalendarDays, Clock, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import type { LocationBookingWithDetails } from '@/types'

type BookingDetailSheetProps = {
  booking: LocationBookingWithDetails | null
  currentUserId: string
  isSuperAdmin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled: () => void
}

export function BookingDetailSheet({
  booking,
  currentUserId,
  isSuperAdmin,
  open,
  onOpenChange,
  onCancelled,
}: BookingDetailSheetProps) {
  const t = useTranslations('bookings')
  const [isCancelling, setIsCancelling] = useState(false)

  if (!booking) return null

  const isAr = typeof document !== 'undefined'
    ? (document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? 'ar').startsWith('ar')
    : true

  const canCancel = booking.booked_by === currentUserId || isSuperAdmin
  const isConfirmed = booking.status === 'confirmed'

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

  const handleCancel = async () => {
    if (isCancelling) return
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) {
        toast.error(t('toastError'))
        return
      }
      toast.success(t('toastCancelled'))
      onCancelled()
    } catch {
      toast.error(t('toastError'))
    } finally {
      setIsCancelling(false)
    }
  }

  const locationName = isAr && booking.location?.name_ar
    ? booking.location.name_ar
    : booking.location?.name ?? ''

  const bookerName = isAr
    ? [booking.booker?.first_name_ar, booking.booker?.last_name_ar].filter(Boolean).join(' ') ||
      [booking.booker?.first_name, booking.booker?.last_name].filter(Boolean).join(' ')
    : [booking.booker?.first_name, booking.booker?.last_name].filter(Boolean).join(' ')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {isAr && booking.title_ar ? booking.title_ar : booking.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Location */}
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm">{locationName}</span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm">{formatDate(booking.starts_at)}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm" dir="ltr">
              {formatTime(booking.starts_at)} - {formatTime(booking.ends_at)}
            </span>
          </div>

          {/* Booked by */}
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">{t('bookedBy')}: </span>
              <span>{bookerName}</span>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm whitespace-pre-wrap" dir="auto">{booking.notes}</p>
            </div>
          )}

          {/* Cancel button */}
          {canCancel && isConfirmed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="h-11 w-full"
                  disabled={isCancelling}
                >
                  {isCancelling ? t('cancelling') : t('cancel')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('cancelTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('cancelBody')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancelCancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('cancelConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
