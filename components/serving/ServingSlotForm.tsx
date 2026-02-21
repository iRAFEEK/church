'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Languages } from 'lucide-react'
import type { ServingArea } from '@/types'

interface ServingSlotFormProps {
  slot?: any
  defaultAreaId?: string
}

export function ServingSlotForm({ slot, defaultAreaId }: ServingSlotFormProps) {
  const router = useRouter()
  const t = useTranslations('serving')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
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

  const titleField = isAr ? 'title_ar' : 'title'
  const titleAltField = isAr ? 'title' : 'title_ar'
  const notesField = isAr ? 'notes_ar' : 'notes'
  const notesAltField = isAr ? 'notes' : 'notes_ar'

  useEffect(() => {
    fetch('/api/serving/areas')
      .then(r => r.json())
      .then(d => setAreas(d.data || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>{t('slotArea')} *</Label>
        <Select value={form.serving_area_id} onValueChange={(v) => setForm({ ...form, serving_area_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder={t('slotAreaPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {areas.map(a => (
              <SelectItem key={a.id} value={a.id}>{isAr ? (a.name_ar || a.name) : a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{tc('title')} *</Label>
        <Input
          value={form[titleField]}
          onChange={(e) => setForm({ ...form, [titleField]: e.target.value })}
          dir={isAr ? 'rtl' : 'ltr'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t('slotDate')} *</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('slotStartTime')}</Label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('slotEndTime')}</Label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('slotMaxVolunteers')}</Label>
        <Input
          type="number"
          min="0"
          value={form.max_volunteers}
          onChange={(e) => setForm({ ...form, max_volunteers: e.target.value })}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-2">
        <Label>{tc('notes')}</Label>
        <Textarea
          value={form[notesField]}
          onChange={(e) => setForm({ ...form, [notesField]: e.target.value })}
          rows={3}
          dir={isAr ? 'rtl' : 'ltr'}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowTranslation(!showTranslation)}
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Languages className="h-4 w-4" />
        {showTranslation ? tc('hideTranslation') : tc('addTranslation')}
      </button>

      {showTranslation && (
        <div className="space-y-4 rounded-lg border p-4 bg-muted/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <Label>{tc('title')} ({isAr ? 'EN' : 'AR'})</Label>
            <Input
              value={form[titleAltField]}
              onChange={(e) => setForm({ ...form, [titleAltField]: e.target.value })}
              dir={isAr ? 'ltr' : 'rtl'}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('notes')} ({isAr ? 'EN' : 'AR'})</Label>
            <Textarea
              value={form[notesAltField]}
              onChange={(e) => setForm({ ...form, [notesAltField]: e.target.value })}
              rows={3}
              dir={isAr ? 'ltr' : 'rtl'}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? t('saving') : slot ? t('updateSlot') : t('createSlot')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
