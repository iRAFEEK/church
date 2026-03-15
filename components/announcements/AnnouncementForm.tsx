'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Stepper, type StepErrors } from '@/components/ui/stepper'
import { FieldError, RequiredMark } from '@/components/ui/field-error'
import { toast } from 'sonner'
import { Megaphone, FileText, Settings, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Announcement, AnnouncementStatus } from '@/types'

interface AnnouncementFormProps {
  announcement?: Announcement
}

const STEPS = [
  { title: 'Content', titleAr: 'المحتوى' },
  { title: 'Settings', titleAr: 'الإعدادات' },
]

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const router = useRouter()
  const t = useTranslations('announcements')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    title: announcement?.title || announcement?.title_ar || '',
    body: announcement?.body || announcement?.body_ar || '',
    status: (announcement?.status || 'draft') as AnnouncementStatus,
    is_pinned: announcement?.is_pinned || false,
    expires_at: announcement?.expires_at ? announcement.expires_at.slice(0, 10) : '',
  })

  const tV = useTranslations('validation')
  const [errors, setErrors] = useState<StepErrors>({})

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error(t('requiredTitle'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: form.title,
        title_ar: form.title,
        body: form.body || null,
        body_ar: form.body || null,
        status: form.status,
        is_pinned: form.is_pinned,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }

      const url = announcement ? `/api/announcements/${announcement.id}` : '/api/announcements'
      const method = announcement ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      const { data } = await res.json()
      toast.success(announcement ? t('announcementUpdated') : t('announcementCreated'))
      router.push(`/admin/announcements/${data.id}`)
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
      if (!form.title.trim()) errs.title = tV('titleRequired')
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
      submitLabel={announcement ? t('updateAnnouncement') : t('createAnnouncement')}
      submitLabelAr={announcement ? t('updateAnnouncement') : t('createAnnouncement')}
      onValidateStep={validateStep}
    >
      {/* Step 1: Content */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Megaphone className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('title')}<RequiredMark /></span>
            </div>
            <Input
              value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(prev => { const next = { ...prev }; delete next.title; return next }) }}
              dir="auto"
              className={cn('text-lg min-h-[48px]', errors.title && 'border-red-500 focus-visible:ring-red-500')}
            />
            <FieldError error={errors.title} />
          </div>
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('body')}</span>
            </div>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={6}
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
              <span className="text-sm font-medium">{t('status')}</span>
            </div>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AnnouncementStatus })}>
              <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('status_draft')}</SelectItem>
                <SelectItem value="published">{t('status_published')}</SelectItem>
                <SelectItem value="archived">{t('status_archived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('expiresAt')}</Label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
            <Switch
              checked={form.is_pinned}
              onCheckedChange={(v) => setForm({ ...form, is_pinned: v })}
            />
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-zinc-400" />
              <Label>{t('isPinned')}</Label>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <ReviewItem icon={<Megaphone className="h-4 w-4" />} label={tc('title')} value={form.title} />
            {form.body && (
              <ReviewItem
                icon={<FileText className="h-4 w-4" />}
                label={tc('body')}
                value={form.body.length > 100 ? form.body.slice(0, 100) + '...' : form.body}
              />
            )}
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
