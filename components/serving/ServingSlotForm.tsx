'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Stepper, type StepErrors } from '@/components/ui/stepper'
import { FieldError, RequiredMark } from '@/components/ui/field-error'
import { toast } from 'sonner'
import { Heart, Calendar, Users, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServingArea } from '@/types'

interface SlotData {
  id: string
  serving_area_id: string
  title: string
  title_ar: string | null
  date: string
  start_time: string | null
  end_time: string | null
  max_volunteers: number | null
  notes: string | null
  notes_ar: string | null
}

interface ServingSlotFormProps {
  slot?: SlotData
  defaultAreaId?: string
}

const STEPS = [
  { title: 'Area & Title', titleAr: 'المجال والعنوان' },
  { title: 'Schedule', titleAr: 'الجدول' },
  { title: 'Review', titleAr: 'مراجعة' },
]

export function ServingSlotForm({ slot, defaultAreaId }: ServingSlotFormProps) {
  const router = useRouter()
  const t = useTranslations('serving')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [areas, setAreas] = useState<ServingArea[]>([])

  const [form, setForm] = useState({
    serving_area_id: slot?.serving_area_id || defaultAreaId || '',
    title: slot?.title || '',
    title_ar: slot?.title_ar || '',
    date: slot?.date || '',
    start_time: slot?.start_time?.slice(0, 5) || '',
    end_time: slot?.end_time?.slice(0, 5) || '',
    max_volunteers: slot?.max_volunteers?.toString() || '',
    notes: slot?.notes || '',
    notes_ar: slot?.notes_ar || '',
  })

  const tV = useTranslations('validation')
  const [errors, setErrors] = useState<StepErrors>({})

  const titleField = isAr ? 'title_ar' : 'title'
  const notesField = isAr ? 'notes_ar' : 'notes'

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/serving/areas', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setAreas(d.data || []) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[ServingSlotForm] Failed to fetch areas:', e)
        }
      })
    return () => controller.abort()
  }, [])

  const handleSubmit = async () => {
    if (!form[titleField] || !form.serving_area_id || !form.date) {
      toast.error(t('requiredTitle'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        serving_area_id: form.serving_area_id,
        title: form.title || form.title_ar || '',
        title_ar: form.title_ar || null,
        date: form.date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        max_volunteers: form.max_volunteers ? parseInt(form.max_volunteers) : null,
        notes: form.notes || null,
        notes_ar: form.notes_ar || null,
      }

      const url = slot ? `/api/serving/slots/${slot.id}` : '/api/serving/slots'
      const method = slot ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      toast.success(slot ? t('slotUpdated') : t('slotCreated'))
      router.push('/admin/serving')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setLoading(false)
    }
  }

  const validateStep = useCallback((): StepErrors | null => {
    const errs: StepErrors = {}
    if (step === 0) {
      if (!form.serving_area_id) errs.serving_area_id = tV('selectRequired')
      if (!form[titleField].trim()) errs[titleField] = tV('titleRequired')
    }
    if (step === 1) {
      if (!form.date) errs.date = tV('dateRequired')
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error(tV('fixErrors'))
      return errs
    }
    setErrors({})
    return null
  }, [step, form, titleField, tV])

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => { setErrors({}); step === 0 ? router.back() : setStep(s => s - 1) }}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={slot ? t('updateSlot') : t('createSlot')}
      submitLabelAr={slot ? t('updateSlot') : t('createSlot')}
      onValidateStep={validateStep}
    >
      {/* Step 1: Area & Title */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Heart className="h-5 w-5" />
              <span className="text-sm font-medium">{t('slotArea')}<RequiredMark /></span>
            </div>
            <Select value={form.serving_area_id} onValueChange={(v) => { setForm({ ...form, serving_area_id: v }); if (errors.serving_area_id) setErrors(prev => { const next = { ...prev }; delete next.serving_area_id; return next }) }}>
              <SelectTrigger className={cn('min-h-[48px]', errors.serving_area_id && 'border-red-500')}><SelectValue placeholder={t('slotAreaPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {areas.map(a => (
                  <SelectItem key={a.id} value={a.id}>{isAr ? (a.name_ar || a.name) : a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError error={errors.serving_area_id} />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{tc('title')}<RequiredMark /></Label>
            <Input
              value={form[titleField]}
              onChange={(e) => { setForm({ ...form, [titleField]: e.target.value }); if (errors[titleField]) setErrors(prev => { const next = { ...prev }; delete next[titleField]; return next }) }}
              dir={isAr ? 'rtl' : 'ltr'}
              className={cn('text-lg min-h-[48px]', errors[titleField] && 'border-red-500 focus-visible:ring-red-500')}
            />
            <FieldError error={errors[titleField]} />
          </div>
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">{t('slotDate')}<RequiredMark /></span>
            </div>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => { setForm({ ...form, date: e.target.value }); if (errors.date) setErrors(prev => { const next = { ...prev }; delete next.date; return next }) }}
              dir="ltr"
              className={cn('min-h-[48px]', errors.date && 'border-red-500 focus-visible:ring-red-500')}
            />
            <FieldError error={errors.date} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('slotStartTime')}</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                dir="ltr"
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('slotEndTime')}</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                dir="ltr"
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">{t('slotMaxVolunteers')}</span>
            </div>
            <Input
              type="number"
              min="0"
              value={form.max_volunteers}
              onChange={(e) => setForm({ ...form, max_volunteers: e.target.value })}
              dir="ltr"
              className="min-h-[48px] max-w-[200px]"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('notes')}</span>
            </div>
            <Textarea
              value={form[notesField]}
              onChange={(e) => setForm({ ...form, [notesField]: e.target.value })}
              rows={3}
              dir={isAr ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="space-y-3 pt-4">
          <ReviewItem
            icon={<Heart className="h-4 w-4" />}
            label={t('slotArea')}
            value={areas.find(a => a.id === form.serving_area_id)?.[isAr ? 'name_ar' : 'name'] || areas.find(a => a.id === form.serving_area_id)?.name || ''}
          />
          <ReviewItem icon={<Heart className="h-4 w-4" />} label={tc('title')} value={form[titleField]} />
          <ReviewItem icon={<Calendar className="h-4 w-4" />} label={t('slotDate')} value={form.date} />
          {form.start_time && <ReviewItem icon={<Calendar className="h-4 w-4" />} label={t('slotStartTime')} value={`${form.start_time}${form.end_time ? ` - ${form.end_time}` : ''}`} />}
          {form.max_volunteers && <ReviewItem icon={<Users className="h-4 w-4" />} label={t('slotMaxVolunteers')} value={form.max_volunteers} />}
        </div>
      )}
    </Stepper>
  )
}

function ReviewItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
      <div className="text-zinc-400 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <p className="text-sm text-zinc-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
