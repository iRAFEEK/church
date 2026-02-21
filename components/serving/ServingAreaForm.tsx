'use client'

import { useState, useEffect } from 'react'
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
import type { ServingArea, Ministry } from '@/types'

interface ServingAreaFormProps {
  area?: ServingArea
}

export function ServingAreaForm({ area }: ServingAreaFormProps) {
  const router = useRouter()
  const t = useTranslations('serving')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [ministries, setMinistries] = useState<Ministry[]>([])

  const [form, setForm] = useState({
    name: area?.name || '',
    name_ar: area?.name_ar || '',
    description: area?.description || '',
    description_ar: area?.description_ar || '',
    ministry_id: area?.ministry_id || '',
    is_active: area?.is_active ?? true,
  })

  const nameField = isAr ? 'name_ar' : 'name'
  const nameAltField = isAr ? 'name' : 'name_ar'
  const descField = isAr ? 'description_ar' : 'description'
  const descAltField = isAr ? 'description' : 'description_ar'

  useEffect(() => {
    fetch('/api/ministries')
      .then(r => r.json())
      .then(d => setMinistries(d.data || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form[nameField]) {
      toast.error(t('requiredName'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name || form.name_ar || '',
        name_ar: form.name_ar || null,
        description: form.description || null,
        description_ar: form.description_ar || null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>{tc('name')} *</Label>
        <Input
          value={form[nameField]}
          onChange={(e) => setForm({ ...form, [nameField]: e.target.value })}
          dir={isAr ? 'rtl' : 'ltr'}
        />
      </div>

      <div className="space-y-2">
        <Label>{tc('description')}</Label>
        <Textarea
          value={form[descField]}
          onChange={(e) => setForm({ ...form, [descField]: e.target.value })}
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
            <Label>{tc('name')} ({isAr ? 'EN' : 'AR'})</Label>
            <Input
              value={form[nameAltField]}
              onChange={(e) => setForm({ ...form, [nameAltField]: e.target.value })}
              dir={isAr ? 'ltr' : 'rtl'}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('description')} ({isAr ? 'EN' : 'AR'})</Label>
            <Textarea
              value={form[descAltField]}
              onChange={(e) => setForm({ ...form, [descAltField]: e.target.value })}
              rows={3}
              dir={isAr ? 'ltr' : 'rtl'}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('areaMinistry')}</Label>
          <Select value={form.ministry_id} onValueChange={(v) => setForm({ ...form, ministry_id: v === 'none' ? '' : v })}>
            <SelectTrigger>
              <SelectValue placeholder={t('areaMinistryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {ministries.map(m => (
                <SelectItem key={m.id} value={m.id}>{isAr ? (m.name_ar || m.name) : m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 pt-6">
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => setForm({ ...form, is_active: v })}
          />
          <Label>{tc('active')}</Label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? t('saving') : area ? t('updateArea') : t('createArea')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
