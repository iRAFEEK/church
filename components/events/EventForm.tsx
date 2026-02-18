'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface EventFormProps {
  event?: {
    id: string
    title: string
    title_ar: string
    description: string | null
    description_ar: string | null
    event_type: string
    starts_at: string
    ends_at: string | null
    location: string | null
    capacity: number | null
    is_public: boolean
    registration_required: boolean
    registration_closes_at: string | null
    status: string
  }
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter()
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: event?.title || '',
    title_ar: event?.title_ar || '',
    description: event?.description || '',
    description_ar: event?.description_ar || '',
    event_type: event?.event_type || 'service',
    starts_at: event?.starts_at ? event.starts_at.slice(0, 16) : '',
    ends_at: event?.ends_at ? event.ends_at.slice(0, 16) : '',
    location: event?.location || '',
    capacity: event?.capacity || '',
    is_public: event?.is_public ?? true,
    registration_required: event?.registration_required ?? false,
    registration_closes_at: event?.registration_closes_at ? event.registration_closes_at.slice(0, 16) : '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.starts_at) {
      toast.error(t('requiredFields'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        capacity: form.capacity ? Number(form.capacity) : null,
        ends_at: form.ends_at || null,
        description: form.description || null,
        description_ar: form.description_ar || null,
        registration_closes_at: form.registration_closes_at || null,
      }

      const url = event ? `/api/events/${event.id}` : '/api/events'
      const method = event ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      toast.success(event ? t('eventUpdated') : t('eventCreated'))
      router.push('/admin/events')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setLoading(false)
    }
  }

  const eventTypes = ['service', 'conference', 'retreat', 'workshop', 'social', 'outreach', 'other']

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('titleEn')}</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('titleAr')}</Label>
          <Input
            value={form.title_ar}
            onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('descriptionEn')}</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('descriptionAr')}</Label>
          <Textarea
            value={form.description_ar}
            onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
            rows={3}
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('eventType')}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
          >
            {eventTypes.map(type => (
              <option key={type} value={type}>{t(`type_${type}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t('location')}</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('startsAt')}</Label>
          <Input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('endsAt')}</Label>
          <Input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('capacity')}</Label>
          <Input
            type="number"
            placeholder={t('capacityPlaceholder')}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('registrationCloses')}</Label>
          <Input
            type="datetime-local"
            value={form.registration_closes_at}
            onChange={(e) => setForm({ ...form, registration_closes_at: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_public}
            onCheckedChange={(checked) => setForm({ ...form, is_public: checked })}
          />
          <Label>{t('isPublic')}</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.registration_required}
            onCheckedChange={(checked) => setForm({ ...form, registration_required: checked })}
          />
          <Label>{t('registrationRequired')}</Label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? t('saving') : event ? t('updateEvent') : t('createEvent')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
