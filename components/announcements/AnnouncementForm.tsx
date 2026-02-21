'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Languages } from 'lucide-react'
import type { Announcement, AnnouncementStatus } from '@/types'

interface AnnouncementFormProps {
  announcement?: Announcement
}

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const router = useRouter()
  const t = useTranslations('announcements')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>{tc('title')} *</Label>
        <Input
          value={form[titleField]}
          onChange={(e) => setForm({ ...form, [titleField]: e.target.value })}
          dir={isAr ? 'rtl' : 'ltr'}
        />
      </div>

      <div className="space-y-2">
        <Label>{tc('body')}</Label>
        <Textarea
          value={form[bodyField]}
          onChange={(e) => setForm({ ...form, [bodyField]: e.target.value })}
          rows={6}
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
            <Label>{tc('body')} ({isAr ? 'EN' : 'AR'})</Label>
            <Textarea
              value={form[bodyAltField]}
              onChange={(e) => setForm({ ...form, [bodyAltField]: e.target.value })}
              rows={6}
              dir={isAr ? 'ltr' : 'rtl'}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t('status')}</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AnnouncementStatus })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('status_draft')}</SelectItem>
              <SelectItem value="published">{t('status_published')}</SelectItem>
              <SelectItem value="archived">{t('status_archived')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('expiresAt')}</Label>
          <Input
            type="date"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <Switch
            checked={form.is_pinned}
            onCheckedChange={(v) => setForm({ ...form, is_pinned: v })}
          />
          <Label>{t('isPinned')}</Label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? t('saving') : announcement ? t('updateAnnouncement') : t('createAnnouncement')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
