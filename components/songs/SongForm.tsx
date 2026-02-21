'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Languages } from 'lucide-react'
import type { Song } from '@/types'

interface SongFormProps {
  song?: Song
}

export function SongForm({ song }: SongFormProps) {
  const router = useRouter()
  const t = useTranslations('songs')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  const [form, setForm] = useState({
    title: song?.title || '',
    title_ar: song?.title_ar || '',
    artist: song?.artist || '',
    artist_ar: song?.artist_ar || '',
    lyrics: song?.lyrics || '',
    lyrics_ar: song?.lyrics_ar || '',
    tags: song?.tags?.join(', ') || '',
  })

  const titleField = isAr ? 'title_ar' : 'title'
  const titleAltField = isAr ? 'title' : 'title_ar'
  const artistField = isAr ? 'artist_ar' : 'artist'
  const artistAltField = isAr ? 'artist' : 'artist_ar'
  const lyricsField = isAr ? 'lyrics_ar' : 'lyrics'
  const lyricsAltField = isAr ? 'lyrics' : 'lyrics_ar'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form[titleField]) {
      toast.error(t('titleRequired'))
      return
    }

    setLoading(true)
    try {
      const tags = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const payload = {
        title: form.title || form.title_ar || '',
        title_ar: form.title_ar || null,
        artist: form.artist || null,
        artist_ar: form.artist_ar || null,
        lyrics: form.lyrics || null,
        lyrics_ar: form.lyrics_ar || null,
        tags,
      }

      const url = song ? `/api/songs/${song.id}` : '/api/songs'
      const method = song ? 'PATCH' : 'POST'

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
      toast.success(song ? t('songUpdated') : t('songCreated'))
      router.push(`/admin/songs/${data.id}`)
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
        <Label>{tc('artist')}</Label>
        <Input
          value={form[artistField]}
          onChange={(e) => setForm({ ...form, [artistField]: e.target.value })}
          dir={isAr ? 'rtl' : 'ltr'}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('tagsLabel')}</Label>
        <Input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder={t('tagsPlaceholder')}
          dir="ltr"
        />
        <p className="text-xs text-muted-foreground">{t('tagsHint')}</p>
      </div>

      <div className="space-y-2">
        <Label>{tc('lyrics')}</Label>
        <Textarea
          value={form[lyricsField]}
          onChange={(e) => setForm({ ...form, [lyricsField]: e.target.value })}
          rows={12}
          dir={isAr ? 'rtl' : 'ltr'}
          placeholder={isAr ? t('lyricsPlaceholderAr') : t('lyricsPlaceholder')}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">{tc('lyricsHint')}</p>
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
            <Label>{tc('artist')} ({isAr ? 'EN' : 'AR'})</Label>
            <Input
              value={form[artistAltField]}
              onChange={(e) => setForm({ ...form, [artistAltField]: e.target.value })}
              dir={isAr ? 'ltr' : 'rtl'}
            />
          </div>
          <div className="space-y-2">
            <Label>{tc('lyrics')} ({isAr ? 'EN' : 'AR'})</Label>
            <Textarea
              value={form[lyricsAltField]}
              onChange={(e) => setForm({ ...form, [lyricsAltField]: e.target.value })}
              rows={12}
              dir={isAr ? 'ltr' : 'rtl'}
              className="font-mono text-sm"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? t('saving') : song ? t('updateSong') : t('createSong')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
