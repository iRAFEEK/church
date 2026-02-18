'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { getNextGatheringDate } from '@/lib/gatherings'

type Group = {
  id: string
  name: string
  name_ar: string | null
  meeting_day: string | null
  meeting_time: string | null
  meeting_location: string | null
}

export function NewGatheringForm({ group }: { group: Group }) {
  const t = useTranslations('gathering')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Pre-fill with next occurrence
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

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">{t('formDateTime')}</label>
        <Input
          type="datetime-local"
          value={form.scheduled_at}
          onChange={e => set('scheduled_at', e.target.value)}
          dir="ltr"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">{t('formLocation')}</label>
        <Input
          placeholder={group.meeting_location || t('formLocationPH')}
          value={form.location}
          onChange={e => set('location', e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">{t('formTopic')}</label>
        <Input
          placeholder={t('formTopicPlaceholder')}
          value={form.topic}
          onChange={e => set('topic', e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-700 mb-1 block">{t('formNotes')}</label>
        <Textarea
          placeholder={t('formNotesPH')}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={() => router.back()}>{t('formCancel')}</Button>
        <Button onClick={submit} disabled={loading || !form.scheduled_at}>
          {loading ? t('formCreating') : t('formCreate')}
        </Button>
      </div>
    </div>
  )
}
