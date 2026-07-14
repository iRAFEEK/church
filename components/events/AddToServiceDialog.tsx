'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { CalendarPlus, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import type { z } from 'zod'
import type { AppendSegmentSchema } from '@/lib/schemas/event'

// The payload IS the append-segment request body — typed straight off the Zod schema so
// callers can only ever pass a shape the POST /api/events/[id]/segments route accepts.
export type AddToServicePayload = z.input<typeof AppendSegmentSchema>

type UpcomingEvent = {
  id: string
  title: string
  title_ar: string | null
  starts_at: string
}

type AddToServiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: AddToServicePayload | null
}

export function AddToServiceDialog({ open, onOpenChange, payload }: AddToServiceDialogProps) {
  const t = useTranslations('addToService')
  const locale = useLocale()
  const isAr = locale === 'ar' || locale === 'ar-eg'
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const eventName = useCallback(
    (e: UpcomingEvent) => (isAr ? e.title_ar || e.title : e.title || e.title_ar) || e.title,
    [isAr]
  )

  const formatDate = useCallback(
    (iso: string) => {
      const intlLocale = locale === 'ar-eg' ? 'ar-EG' : locale
      try {
        return new Date(iso).toLocaleString(intlLocale, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      } catch {
        return new Date(iso).toLocaleString()
      }
    },
    [locale]
  )

  // Load the church's upcoming events each time the dialog opens.
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setError(false)

    fetch('/api/events/upcoming', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load events')
        return r.json()
      })
      .then((d) => setEvents(d.data || []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(true)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [open])

  const handleSelect = async (event: UpcomingEvent) => {
    if (!payload || submittingId) return
    setSubmittingId(event.id)
    try {
      const res = await fetch(`/api/events/${event.id}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to append segment')
      toast.success(t('success', { event: eventName(event) }))
      onOpenChange(false)
    } catch {
      toast.error(t('error'))
    } finally {
      setSubmittingId(null)
    }
  }

  const body = (
    <div className="mt-2">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-muted-foreground">{t('errorLoad')}</div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <CalendarPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mb-4 max-w-[260px] text-sm text-muted-foreground">{t('empty')}</p>
          <Button asChild variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            <Link href="/admin/events">{t('createEvent')}</Link>
          </Button>
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-auto pb-1">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => handleSelect(event)}
              disabled={submittingId !== null}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-4 py-3 text-start transition-colors hover:bg-muted/50 disabled:opacity-60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{eventName(event)}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatDate(event.starts_at)}
                </p>
              </div>
              {submittingId === event.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-start">
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
