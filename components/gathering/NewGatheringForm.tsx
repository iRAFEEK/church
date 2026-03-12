'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Stepper } from '@/components/ui/stepper'
import { toast } from 'sonner'
import { getNextGatheringDate } from '@/lib/gatherings'
import { Calendar, MapPin, BookOpen, FileText } from 'lucide-react'

type Group = {
  id: string
  name: string
  name_ar: string | null
  meeting_day: string | null
  meeting_time: string | null
  meeting_location: string | null
}

const STEPS = [
  { title: 'When?', titleAr: 'متى؟' },
  { title: 'Where?', titleAr: 'أين؟' },
  { title: 'Topic', titleAr: 'الموضوع' },
  { title: 'Review', titleAr: 'مراجعة' },
]

export function NewGatheringForm({ group }: { group: Group }) {
  const t = useTranslations('gathering')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const nextDate = group.meeting_day
    ? getNextGatheringDate(group.meeting_day, group.meeting_time)
    : new Date()

  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [form, setForm] = useState({
    scheduled_at: toLocalInput(nextDate),
    location: group.meeting_location || '',
    topic: '',
    notes: '',
  })

  function set(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/gatherings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          location: form.location || null,
          topic: form.topic || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      toast.success(t('toastCreated'))
      router.push(`/groups/${group.id}/gathering/${data.id}`)
    } catch {
      toast.error(t('toastError'))
    } finally {
      setLoading(false)
    }
  }

  const canProceed = step === 0 ? !!form.scheduled_at : true

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => step === 0 ? router.back() : setStep(s => s - 1)}
      onSubmit={submit}
      isSubmitting={loading}
      submitLabel={t('formCreate')}
      submitLabelAr={t('formCreate')}
      canProceed={canProceed}
    >
      {/* Step 1: When */}
      {step === 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">{t('formDateTime')}</span>
          </div>
          <Input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={e => set('scheduled_at', e.target.value)}
            dir="ltr"
            className="text-lg min-h-[48px]"
          />
        </div>
      )}

      {/* Step 2: Where */}
      {step === 1 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-medium">{t('formLocation')}</span>
          </div>
          <Input
            placeholder={group.meeting_location || t('formLocationPH')}
            value={form.location}
            onChange={e => set('location', e.target.value)}
            className="text-lg min-h-[48px]"
          />
          <p className="text-xs text-zinc-400">{tc('optional')}</p>
        </div>
      )}

      {/* Step 3: Topic + Notes */}
      {step === 2 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3 text-zinc-500 mb-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">{t('formTopic')}</span>
          </div>
          <Input
            placeholder={t('formTopicPlaceholder')}
            value={form.topic}
            onChange={e => set('topic', e.target.value)}
            className="text-lg min-h-[48px]"
          />
          <div className="mt-4">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{t('formNotes')}</span>
            </div>
            <Textarea
              placeholder={t('formNotesPH')}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="min-h-[48px]"
            />
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <div className="space-y-3 pt-4">
          <ReviewItem
            icon={<Calendar className="h-4 w-4" />}
            label={t('formDateTime')}
            value={new Date(form.scheduled_at).toLocaleString(isRTL ? 'ar' : 'en', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />
          {form.location && (
            <ReviewItem
              icon={<MapPin className="h-4 w-4" />}
              label={t('formLocation')}
              value={form.location}
            />
          )}
          {form.topic && (
            <ReviewItem
              icon={<BookOpen className="h-4 w-4" />}
              label={t('formTopic')}
              value={form.topic}
            />
          )}
          {form.notes && (
            <ReviewItem
              icon={<FileText className="h-4 w-4" />}
              label={t('formNotes')}
              value={form.notes}
            />
          )}
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
