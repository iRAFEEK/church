'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NEED_CATEGORIES, NEED_URGENCIES } from '@/lib/community/constants'
import type { ChurchNeed } from '@/types'

interface NeedFormProps {
  initial?: ChurchNeed
}

export function NeedForm({ initial }: NeedFormProps) {
  const t = useTranslations('churchNeeds')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const router = useRouter()

  // Single field per input — stored in the column matching the current locale
  const titleField = isAr ? 'title_ar' : 'title'
  const descField = isAr ? 'description_ar' : 'description'

  const [form, setForm] = useState({
    title: isAr ? (initial?.title_ar || initial?.title || '') : (initial?.title || ''),
    description: isAr ? (initial?.description_ar || initial?.description || '') : (initial?.description || ''),
    category: initial?.category || 'other',
    quantity: initial?.quantity || 1,
    urgency: initial?.urgency || 'medium',
    contact_name: initial?.contact_name || '',
    contact_phone: initial?.contact_phone || '',
    contact_email: initial?.contact_email || '',
    expires_at: initial?.expires_at ? initial.expires_at.slice(0, 10) : '',
    image_url: initial?.image_url || '',
  })

  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, val: string | number) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('church-needs')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('church-needs')
        .getPublicUrl(path)

      set('image_url', publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        // title is NOT NULL in DB — always populate it; also set the locale-specific column
        title: form.title,
        title_ar: isAr ? form.title : null,
        description: form.description || null,
        description_ar: isAr ? (form.description || null) : null,
        category: form.category,
        quantity: form.quantity,
        urgency: form.urgency,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        image_url: form.image_url || null,
      }

      const url = initial
        ? `/api/community/needs/${initial.id}`
        : '/api/community/needs'

      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      const { data } = await res.json()
      router.push(`/community/needs/${data.id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass = 'h-9 w-full rounded-md border bg-background px-3 text-sm'

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {initial ? t('editNeed') : t('postNeed')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <Label>{t('needTitle')}</Label>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              dir="auto"
            />
          </div>

          {/* Description */}
          <div>
            <Label>{t('needDescription')}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              dir="auto"
            />
          </div>

          {/* Category + Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('category')}</Label>
              <select
                className={selectClass}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {NEED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('urgency')}</Label>
              <select
                className={selectClass}
                value={form.urgency}
                onChange={(e) => set('urgency', e.target.value)}
              >
                {NEED_URGENCIES.map((u) => (
                  <option key={u} value={u}>{t(`urgencies.${u}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label>{t('quantity')}</Label>
            <Input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => set('quantity', parseInt(e.target.value) || 1)}
              className="w-32"
            />
          </div>

          {/* Image */}
          <div>
            <Label>{t('imageUpload')}</Label>
            {form.image_url ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted mt-1">
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 end-2 h-7 w-7"
                  onClick={() => set('image_url', '')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-1">
                <div className="text-center">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">{t('imageUpload')}</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                />
              </label>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>{t('contactName')}</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => set('contact_name', e.target.value)}
              />
            </div>
            <div>
              <Label>{t('contactPhone')}</Label>
              <Input
                value={form.contact_phone}
                onChange={(e) => set('contact_phone', e.target.value)}
                type="tel"
                dir="ltr"
              />
            </div>
            <div>
              <Label>{t('contactEmail')}</Label>
              <Input
                value={form.contact_email}
                onChange={(e) => set('contact_email', e.target.value)}
                type="email"
                dir="ltr"
              />
            </div>
          </div>

          {/* Expiration */}
          <div>
            <Label>{t('expiresAt')}</Label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => set('expires_at', e.target.value)}
              className="w-48"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={submitting || !form.title}>
              {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {initial ? t('editNeed') : t('postNeed')}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              {t('cancel') || 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
