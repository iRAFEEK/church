'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Users, ListOrdered, Calendar, Check, ArrowLeft, Loader2, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomFieldsRenderer } from '@/components/events/CustomFieldsRenderer'
import type { CustomFieldDefinition } from '@/types'

const EVENT_TYPE_ICONS: Record<string, string> = {
  service: '⛪', conference: '🎤', retreat: '🏕️', workshop: '📝',
  social: '🎉', outreach: '🤝', other: '📌',
}

interface TemplateItem {
  id: string
  name: string
  name_ar: string | null
  event_type: string
  title: string
  title_ar: string | null
  location: string | null
  needs_count: number
  segments_count: number
  recurrence_type?: string | null
  recurrence_day?: number | null
  default_start_time?: string | null
  default_end_time?: string | null
  custom_fields?: CustomFieldDefinition[] | null
}

function getNextOccurrence(recurrenceType: string, dayOfWeek: number, startTime?: string | null): string {
  const now = new Date()
  const target = new Date()

  // Find next matching day
  const currentDay = now.getDay()
  let daysAhead = dayOfWeek - currentDay
  if (daysAhead <= 0) daysAhead += 7

  target.setDate(now.getDate() + daysAhead)

  if (startTime) {
    const [hours, minutes] = startTime.split(':').map(Number)
    target.setHours(hours, minutes, 0, 0)
  } else {
    target.setHours(10, 0, 0, 0)
  }

  // Format as datetime-local value
  const year = target.getFullYear()
  const month = String(target.getMonth() + 1).padStart(2, '0')
  const day = String(target.getDate()).padStart(2, '0')
  const h = String(target.getHours()).padStart(2, '0')
  const m = String(target.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${h}:${m}`
}

function getEndTime(startsAt: string, defaultEndTime?: string | null, defaultStartTime?: string | null): string {
  if (!defaultEndTime || !defaultStartTime || !startsAt) return ''

  const [startH, startM] = defaultStartTime.split(':').map(Number)
  const [endH, endM] = defaultEndTime.split(':').map(Number)
  const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  if (durationMinutes <= 0) return ''

  const start = new Date(startsAt)
  start.setMinutes(start.getMinutes() + durationMinutes)

  const year = start.getFullYear()
  const month = String(start.getMonth() + 1).padStart(2, '0')
  const day = String(start.getDate()).padStart(2, '0')
  const h = String(start.getHours()).padStart(2, '0')
  const m = String(start.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${h}:${m}`
}

export default function CreateFromTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('template')
  const t = useTranslations('templates')
  const te = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId)
  const [step, setStep] = useState(preselectedId ? 1 : 0)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/templates', { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (controller.signal.aborted) return
        setTemplates(d.data || [])
        // Also fetch full details for templates to get schedule info
        ;(d.data || []).forEach((tmpl: TemplateItem) => {
          fetch(`/api/templates/${tmpl.id}`, { signal: controller.signal })
            .then(r => r.json())
            .then(detail => {
              if (controller.signal.aborted) return
              if (detail.data) {
                setTemplates(prev => prev.map(t =>
                  t.id === tmpl.id ? {
                    ...t,
                    recurrence_type: detail.data.recurrence_type,
                    recurrence_day: detail.data.recurrence_day,
                    default_start_time: detail.data.default_start_time,
                    default_end_time: detail.data.default_end_time,
                    custom_fields: detail.data.custom_fields,
                  } : t
                ))
              }
            })
            .catch((e) => { if (e instanceof Error && e.name !== 'AbortError') { /* ignore */ } })
        })
      })
      .catch((e) => { if (e instanceof Error && e.name !== 'AbortError') { /* ignore */ } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const selectedTemplate = templates.find(t => t.id === selectedId)

  // Auto-populate dates when template with recurrence is selected
  useEffect(() => {
    if (selectedTemplate?.recurrence_type && selectedTemplate.recurrence_type !== 'none' && selectedTemplate.recurrence_day !== null && selectedTemplate.recurrence_day !== undefined) {
      const nextDate = getNextOccurrence(
        selectedTemplate.recurrence_type,
        selectedTemplate.recurrence_day,
        selectedTemplate.default_start_time
      )
      setStartsAt(nextDate)
      const end = getEndTime(nextDate, selectedTemplate.default_end_time, selectedTemplate.default_start_time)
      if (end) setEndsAt(end)
    }
  }, [selectedTemplate?.id, selectedTemplate?.recurrence_type, selectedTemplate?.recurrence_day, selectedTemplate?.default_start_time, selectedTemplate?.default_end_time])

  const handleCreate = async () => {
    if (!selectedId || !startsAt) {
      toast.error(te('requiredFields'))
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/events/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedId,
          starts_at: startsAt,
          ends_at: endsAt || null,
          custom_field_values: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      toast.success(te('eventCreated'))
      router.push(`/admin/events/${data.data.id}`)
    } catch {
      toast.error(te('errorGeneral'))
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const customFields = selectedTemplate?.custom_fields || []

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => step === 0 ? router.back() : setStep(0)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <h1 className="text-xl font-bold text-zinc-900">{t('createFromTemplate')}</h1>
      </div>

      {/* Step 0: Pick template */}
      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">{t('pickTemplate')}</p>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
              {t('noTemplates')}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(tmpl => {
                const name = isRTL ? (tmpl.name_ar || tmpl.name) : tmpl.name
                const isSelected = selectedId === tmpl.id
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => { setSelectedId(tmpl.id); setStep(1) }}
                    className={cn(
                      'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-start transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-zinc-200 hover:border-zinc-300'
                    )}
                  >
                    <span className="text-2xl">{EVENT_TYPE_ICONS[tmpl.event_type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800">{name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <Badge variant="secondary" className="text-xs">
                          {te(`type_${tmpl.event_type}`)}
                        </Badge>
                        {tmpl.needs_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {tmpl.needs_count} {t('teams')}
                          </span>
                        )}
                        {tmpl.segments_count > 0 && (
                          <span className="flex items-center gap-1">
                            <ListOrdered className="h-3 w-3" /> {tmpl.segments_count} {t('segments')}
                          </span>
                        )}
                        {tmpl.recurrence_type && tmpl.recurrence_type !== 'none' && (
                          <span className="flex items-center gap-1">
                            <Repeat className="h-3 w-3" /> {t(`recurrence${tmpl.recurrence_type.charAt(0).toUpperCase() + tmpl.recurrence_type.slice(1)}` as any)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Pick date/time + custom fields */}
      {step === 1 && selectedTemplate && (
        <div className="space-y-5">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-3">
            <span className="text-xl">{EVENT_TYPE_ICONS[selectedTemplate.event_type] || '📌'}</span>
            <div>
              <p className="text-sm font-medium text-zinc-800">
                {isRTL ? (selectedTemplate.name_ar || selectedTemplate.name) : selectedTemplate.name}
              </p>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="text-xs text-primary hover:underline"
              >
                {t('changeTemplate')}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">{te('startsAt')} *</span>
            </div>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              dir="ltr"
              className="text-lg min-h-[48px]"
            />
          </div>

          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{te('endsAt')}</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>

          {/* Custom fields from template */}
          {customFields.length > 0 && (
            <div className="border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-zinc-500 mb-3">{t('customFields')}</p>
              <CustomFieldsRenderer
                fields={customFields}
                values={customFieldValues}
                onChange={setCustomFieldValues}
              />
            </div>
          )}

          <div className="text-xs text-zinc-400 space-y-1">
            {selectedTemplate.location && <p>📍 {selectedTemplate.location}</p>}
            {selectedTemplate.needs_count > 0 && (
              <p>👥 {selectedTemplate.needs_count} {t('teams')} {t('willBeCopied')}</p>
            )}
            {selectedTemplate.segments_count > 0 && (
              <p>📋 {selectedTemplate.segments_count} {t('segments')} {t('willBeCopied')}</p>
            )}
          </div>

          <Button
            className="w-full min-h-[48px] bg-green-600 hover:bg-green-700"
            disabled={!startsAt || creating}
            onClick={handleCreate}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Check className="h-4 w-4 me-2" />
            )}
            {t('createEvent')}
          </Button>
        </div>
      )}
    </div>
  )
}
