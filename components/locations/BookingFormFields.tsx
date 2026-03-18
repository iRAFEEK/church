'use client'

import { useEffect, useRef, useCallback } from 'react'

import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Conflict = {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
  ends_at: string
}

export type BookingFormState = {
  locationId: string
  title: string
  date: string
  startTime: string
  endTime: string
  notes: string
  isPublic: boolean
}

type BookingFormFieldsProps = {
  locations: { id: string; name: string; name_ar: string | null }[]
  state: BookingFormState
  onChange: (partial: Partial<BookingFormState>) => void
  conflicts: Conflict[]
  isSubmitting: boolean
  canSetPublic: boolean
  canSubmit: boolean
  onSubmit: () => void
  isAr: boolean
}

export function BookingFormFields({
  locations,
  state,
  onChange,
  conflicts,
  isSubmitting,
  canSetPublic,
  canSubmit,
  onSubmit,
  isAr,
}: BookingFormFieldsProps) {
  const t = useTranslations('bookings')

  const handleStartTimeChange = (value: string) => {
    onChange({ startTime: value })
    if (value) {
      const [h, m] = value.split(':').map(Number)
      const endH = Math.min(h + 1, 23)
      onChange({
        startTime: value,
        endTime: `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Location */}
      <div className="space-y-2">
        <Label>{t('location')}</Label>
        <Select value={state.locationId} onValueChange={(v) => onChange({ locationId: v })}>
          <SelectTrigger className="h-11 w-full text-base">
            <SelectValue placeholder={t('selectLocation')} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
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
          value={state.title}
          onChange={(e) => onChange({ title: e.target.value })}
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
          value={state.date}
          onChange={(e) => onChange({ date: e.target.value })}
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
            value={state.startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>{t('endTime')}</Label>
          <Input
            type="time"
            dir="ltr"
            className="h-11 text-base"
            value={state.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
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
          {conflicts.map((c) => (
            <div key={c.id} className="text-sm text-amber-600 ps-6">
              <span className="font-medium">
                {isAr && c.title_ar ? c.title_ar : c.title}
              </span>
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
          value={state.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
        />
      </div>

      {/* Show on dashboard */}
      {canSetPublic && (
        <div className="flex items-center gap-3 h-11">
          <Checkbox
            id="is-public"
            checked={state.isPublic}
            onCheckedChange={(checked) => onChange({ isPublic: checked === true })}
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
        onClick={onSubmit}
      >
        {isSubmitting ? t('booking') : t('book')}
      </Button>
    </div>
  )
}
