'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

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
import { BookingFormFields, type BookingFormState } from './BookingFormFields'

type Conflict = {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
  ends_at: string
}

type NewBookingModalProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  prefilledLocationId?: string
  prefilledDate?: string
  prefilledHour?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  canSetPublic?: boolean
}

function padTime(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

export function NewBookingModal({
  locations,
  prefilledLocationId,
  prefilledDate,
  prefilledHour,
  open,
  onOpenChange,
  onCreated,
  canSetPublic = false,
}: NewBookingModalProps) {
  const t = useTranslations('bookings')
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const [formState, setFormState] = useState<BookingFormState>({
    locationId: prefilledLocationId ?? '',
    title: '',
    date: prefilledDate ?? '',
    startTime: prefilledHour !== undefined ? padTime(prefilledHour) : '',
    endTime: prefilledHour !== undefined ? padTime(prefilledHour + 1) : '',
    notes: '',
    isPublic: false,
  })

  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isAr =
    typeof document !== 'undefined'
      ? (document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? 'ar').startsWith('ar')
      : true

  // Reset form when opening with new prefill values
  useEffect(() => {
    if (open) {
      setFormState({
        locationId: prefilledLocationId ?? '',
        title: '',
        date: prefilledDate ?? '',
        startTime: prefilledHour !== undefined ? padTime(prefilledHour) : '',
        endTime: prefilledHour !== undefined ? padTime(prefilledHour + 1) : '',
        notes: '',
        isPublic: false,
      })
      setConflicts([])
    }
  }, [open, prefilledLocationId, prefilledDate, prefilledHour])

  // Real-time conflict detection
  const checkConflicts = useCallback(
    async (locId: string, d: string, start: string, end: string) => {
      if (!locId || !d || !start || !end) {
        setConflicts([])
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(
          `/api/locations/${locId}/availability?date=${d}&start=${start}&end=${end}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const json = await res.json()
        setConflicts(json.conflicts ?? [])
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      }
    },
    []
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      checkConflicts(formState.locationId, formState.date, formState.startTime, formState.endTime)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [formState.locationId, formState.date, formState.startTime, formState.endTime, checkConflicts])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const handleChange = (partial: Partial<BookingFormState>) => {
    setFormState((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!formState.locationId || !formState.title.trim() || !formState.date || !formState.startTime || !formState.endTime) return

    setIsSubmitting(true)
    try {
      const startsAt = `${formState.date}T${formState.startTime}:00`
      const endsAt = `${formState.date}T${formState.endTime}:00`

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: formState.locationId,
          title: formState.title.trim(),
          starts_at: startsAt,
          ends_at: endsAt,
          notes: formState.notes.trim() || null,
          is_public: formState.isPublic,
        }),
      })

      if (res.status === 409) {
        toast.error(t('toastConflict'))
        checkConflicts(formState.locationId, formState.date, formState.startTime, formState.endTime)
        return
      }

      if (!res.ok) {
        toast.error(t('toastError'))
        return
      }

      toast.success(t('toastCreated'))
      onCreated()
      onOpenChange(false)
    } catch {
      toast.error(t('toastError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit =
    !!formState.locationId &&
    !!formState.title.trim() &&
    !!formState.date &&
    !!formState.startTime &&
    !!formState.endTime &&
    conflicts.length === 0

  const formContent = (
    <BookingFormFields
      locations={locations}
      state={formState}
      onChange={handleChange}
      conflicts={conflicts}
      isSubmitting={isSubmitting}
      canSetPublic={canSetPublic}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
      isAr={isAr}
    />
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('newBooking')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">{formContent}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('newBooking')}</SheetTitle>
        </SheetHeader>
        <div className="py-4">{formContent}</div>
      </SheetContent>
    </Sheet>
  )
}
