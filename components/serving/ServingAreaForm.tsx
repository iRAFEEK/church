'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Stepper, type StepErrors } from '@/components/ui/stepper'
import { FieldError, RequiredMark } from '@/components/ui/field-error'
import { toast } from 'sonner'
import { Heart, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServingArea, Ministry } from '@/types'

interface ServingAreaFormProps {
  area?: ServingArea
}

const STEPS = [
  { title: 'Name & Description', titleAr: 'الاسم والوصف' },
  { title: 'Settings', titleAr: 'الإعدادات' },
]

export function ServingAreaForm({ area }: ServingAreaFormProps) {
  const router = useRouter()
  const t = useTranslations('serving')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [ministries, setMinistries] = useState<Ministry[]>([])

  const [form, setForm] = useState({
    name: area?.name || area?.name_ar || '',
    description: area?.description || area?.description_ar || '',
    ministry_id: area?.ministry_id || '',
    is_active: area?.is_active ?? true,
  })

  const tV = useTranslations('validation')
  const [errors, setErrors] = useState<StepErrors>({})

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ministries', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setMinistries(d.data || []) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[ServingAreaForm] Failed to fetch ministries:', e)
        }
      })
    return () => controller.abort()
  }, [])

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error(t('requiredName'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        name_ar: form.name,
        description: form.description || null,
        description_ar: form.description || null,
        ministry_id: form.ministry_id || null,
        is_active: form.is_active,
      }

      const url = area ? `/api/serving/areas/${area.id}` : '/api/serving/areas'
      const method = area ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      toast.success(area ? t('areaUpdated') : t('areaCreated'))
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
      if (!form.name.trim()) errs.name = tV('nameRequired')
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error(tV('fixErrors'))
      return errs
    }
    setErrors({})
    return null
  }, [step, form, tV])

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => { setErrors({}); step === 0 ? router.back() : setStep(s => s - 1) }}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={area ? t('updateArea') : t('createArea')}
      submitLabelAr={area ? t('updateArea') : t('createArea')}
      onValidateStep={validateStep}
    >
      {/* Step 1: Name & Description */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Heart className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('name')}<RequiredMark /></span>
            </div>
            <Input
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors(prev => { const next = { ...prev }; delete next.name; return next }) }}
              dir="auto"
              className={cn('text-lg min-h-[48px]', errors.name && 'border-red-500 focus-visible:ring-red-500')}
            />
            <FieldError error={errors.name} />
          </div>
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('description')}</span>
            </div>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              dir="auto"
            />
          </div>
        </div>
      )}

      {/* Step 2: Settings & Review */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Settings className="h-5 w-5" />
              <span className="text-sm font-medium">{t('areaMinistry')}</span>
            </div>
            <Select value={form.ministry_id} onValueChange={(v) => setForm({ ...form, ministry_id: v === 'none' ? '' : v })}>
              <SelectTrigger className="min-h-[48px]"><SelectValue placeholder={t('areaMinistryPlaceholder')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">--</SelectItem>
                {ministries.map(m => (
                  <SelectItem key={m.id} value={m.id}>{isAr ? (m.name_ar || m.name) : m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>{tc('active')}</Label>
          </div>
          <div className="space-y-3 pt-2">
            <ReviewItem icon={<Heart className="h-4 w-4" />} label={tc('name')} value={form.name} />
            {form.description && <ReviewItem icon={<FileText className="h-4 w-4" />} label={tc('description')} value={form.description} />}
          </div>
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
