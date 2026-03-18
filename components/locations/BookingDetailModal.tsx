'use client'

import { useTranslations } from 'next-intl'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { BookingDetailContent } from './BookingDetailContent'

import type { LocationBookingWithDetails } from '@/types'

type BookingDetailModalProps = {
  booking: LocationBookingWithDetails | null
  currentUserId: string
  isSuperAdmin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancelled: () => void
}

export function BookingDetailModal({
  booking,
  currentUserId,
  isSuperAdmin,
  open,
  onOpenChange,
  onCancelled,
}: BookingDetailModalProps) {
  const t = useTranslations('bookings')
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (!booking) return null

  const isAr =
    typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? 'ar').startsWith('ar')
      : true

  const title = isAr && booking.title_ar ? booking.title_ar : booking.title

  const content = (
    <BookingDetailContent
      booking={booking}
      currentUserId={currentUserId}
      isSuperAdmin={isSuperAdmin}
      onCancelled={onCancelled}
    />
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="py-2">{content}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="py-4">{content}</div>
      </SheetContent>
    </Sheet>
  )
}
