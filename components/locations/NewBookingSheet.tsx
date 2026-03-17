"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type NewBookingSheetProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  prefilledLocationId?: string
  prefilledDate?: string
  prefilledHour?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  canSetPublic?: boolean
}

type Conflict = {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
  ends_at: string
}

function padTime(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

export function NewBookingSheet({
  locations,
  prefilledLocationId,
  prefilledDate,
  prefilledHour,
  open,
  onOpenChange,
  onCreated,
  canSetPublic = false,
}: NewBookingSheetProps) {
  const t = useTranslations('bookings')

  const [locationId, setLocationId] = useState(prefilledLocationId ?? '')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(prefilledDate ?? '')
  const [startTime, setStartTime] = useState(prefilledHour !== undefined ? padTime(prefilledHour) : '')
  const [endTime, setEndTime] = useState(
    prefilledHour !== undefined ? padTime(prefilledHour + 1) : ''
  )
  const [notes, setNotes] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Reset form when opening with new prefill values
  useEffect(() => {
    if (open) {
      setLocationId(prefilledLocationId ?? '')
      setDate(prefilledDate ?? '')
      setStartTime(prefilledHour !== undefined ? padTime(prefilledHour) : '')
      setEndTime(prefilledHour !== undefined ? padTime(prefilledHour + 1) : '')
      setTitle('')
      setNotes('')
      setIsPublic(false)
      setConflicts([])
    }
  }, [open, prefilledLocationId, prefilledDate, prefilledHour])

  // Auto-set end time to start + 1 hour when start changes
  const handleStartTimeChange = (value: string) => {
    setStartTime(value)
    if (value) {
      const [h, m] = value.split(':').map(Number)
      const endH = Math.min(h + 1, 23)
      setEndTime(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }

  // Real-time conflict detection
  const checkConflicts = useCallback(async (locId: string, d: string, start: string, end: string) => {
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
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      checkConflicts(locationId, date, startTime, endTime)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [locationId, date, startTime, endTime, checkConflicts])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const isAr = typeof document !== 'undefined'
    ? (document.cookie.match(/(?:^|;\s*)lang=([^;]*)/)?.[1] ?? 'ar').startsWith('ar')
    : true

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!locationId || !title.trim() || !date || !startTime || !endTime) return

    setIsSubmitting(true)
    try {
      const startsAt = `${date}T${startTime}:00`
      const endsAt = `${date}T${endTime}:00`

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          title: title.trim(),
          starts_at: startsAt,
          ends_at: endsAt,
          notes: notes.trim() || null,
          is_public: isPublic,
        }),
      })

      if (res.status === 409) {
        toast.error(t('toastConflict'))
        // Re-check conflicts
        checkConflicts(locationId, date, startTime, endTime)
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

  const canSubmit = locationId && title.trim() && date && startTime && endTime && conflicts.length === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('newBooking')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Location */}
          <div className="space-y-2">
            <Label>{t('location')}</Label>
            <Select value={locationId} onValueChange={setLocationId}>
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
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>{t('title')}</Label>
            <Input
              dir="auto"
              className="h-11 text-base"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t('date')}</Label>
            <Input
              type="date"
              dir="ltr"
              className="h-11 text-base"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('startTime')}</Label>
              <Input
                type="time"
                dir="ltr"
                className="h-11 text-base"
                value={startTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('endTime')}</Label>
              <Input
                type="time"
                dir="ltr"
                className="h-11 text-base"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Conflict warning */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{t('conflictTitle')}</span>
              </div>
              {conflicts.map(c => (
                <div key={c.id} className="text-sm text-amber-600 ps-6">
                  <span className="font-medium">{isAr && c.title_ar ? c.title_ar : c.title}</span>
                  <span className="ms-2" dir="ltr">
                    {new Date(c.starts_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' - '}
                    {new Date(c.ends_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('notes')}</Label>
            <Textarea
              dir="auto"
              className="text-base"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Show on dashboard */}
          {canSetPublic && (
            <div className="flex items-center gap-3 h-11">
              <Checkbox
                id="is-public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <Label htmlFor="is-public" className="text-sm cursor-pointer">
                {t('showOnDashboard')}
              </Label>
            </div>
          )}

          {/* Submit */}
          <Button
            className="h-11 w-full"
            disabled={isSubmitting || !canSubmit}
            onClick={handleSubmit}
          >
            {isSubmitting ? t('booking') : t('book')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
