'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Stepper } from '@/components/ui/stepper'
import { toast } from 'sonner'
import { Megaphone, FileText, Settings, Pin } from 'lucide-react'
import type { Announcement, AnnouncementStatus } from '@/types'

interface AnnouncementFormProps {
  announcement?: Announcement
}

const STEPS = [
  { title: 'Content', titleAr: 'المحتوى' },
  { title: 'Translation', titleAr: 'الترجمة' },
  { title: 'Settings', titleAr: 'الإعدادات' },
]

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const router = useRouter()
  const t = useTranslations('announcements')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    title: announcement?.title || '',
    title_ar: announcement?.title_ar || '',
    body: announcement?.body || '',
    body_ar: announcement?.body_ar || '',
    status: (announcement?.status || 'draft') as AnnouncementStatus,
    is_pinned: announcement?.is_pinned || false,
    expires_at: announcement?.expires_at ? announcement.expires_at.slice(0, 10) : '',
  })

  const titleField = isAr ? 'title_ar' : 'title'
  const titleAltField = isAr ? 'title' : 'title_ar'
  const bodyField = isAr ? 'body_ar' : 'body'
  const bodyAltField = isAr ? 'body' : 'body_ar'

  const handleSubmit = async () => {
    const primaryTitle = form[titleField]
    if (!primaryTitle) {
      toast.error(t('requiredTitle'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: form.title || form.title_ar || '',
        title_ar: form.title_ar || null,
        body: form.body || null,
        body_ar: form.body_ar || null,
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

  const canProceed = step === 0 ? !!form[titleField] : true

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => step === 0 ? router.back() : setStep(s => s - 1)}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={announcement ? t('updateAnnouncement') : t('createAnnouncement')}
      submitLabelAr={announcement ? t('updateAnnouncement') : t('createAnnouncement')}
      canProceed={canProceed}
    >
      {/* Step 1: Content */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Megaphone className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('title')} *</span>
            </div>
            <Input
              value={form[titleField]}
              onChange={(e) => setForm({ ...form, [titleField]: e.target.value })}
              dir={isAr ? 'rtl' : 'ltr'}
              className="text-lg min-h-[48px]"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('body')}</span>
            </div>
            <Textarea
              value={form[bodyField]}
              onChange={(e) => setForm({ ...form, [bodyField]: e.target.value })}
              rows={6}
              dir={isAr ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      )}

      {/* Step 2: Translation */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <p className="text-sm text-zinc-500">{tc('addTranslation')}</p>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{tc('title')} ({isAr ? 'EN' : 'AR'})</Label>
            <Input
              value={form[titleAltField]}
              onChange={(e) => setForm({ ...form, [titleAltField]: e.target.value })}
              dir={isAr ? 'ltr' : 'rtl'}
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{tc('body')} ({isAr ? 'EN' : 'AR'})</Label>
            <Textarea
              value={form[bodyAltField]}
              onChange={(e) => setForm({ ...form, [bodyAltField]: e.target.value })}
              rows={6}
              dir={isAr ? 'ltr' : 'rtl'}
            />
          </div>
        </div>
      )}

      {/* Step 3: Settings & Review */}
      {step === 2 && (
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
            <ReviewItem icon={<Megaphone className="h-4 w-4" />} label={tc('title')} value={form[titleField]} />
            {form[bodyField] && (
              <ReviewItem
                icon={<FileText className="h-4 w-4" />}
                label={tc('body')}
                value={form[bodyField].length > 100 ? form[bodyField].slice(0, 100) + '...' : form[bodyField]}
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
