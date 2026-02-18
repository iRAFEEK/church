'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Song } from '@/types'

interface SongFormProps {
  song?: Song
}

export function SongForm({ song }: SongFormProps) {
  const router = useRouter()
  const t = useTranslations('songs')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: song?.title || '',
    title_ar: song?.title_ar || '',
    artist: song?.artist || '',
    artist_ar: song?.artist_ar || '',
    lyrics: song?.lyrics || '',
    lyrics_ar: song?.lyrics_ar || '',
    tags: song?.tags?.join(', ') || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) {
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
        title: form.title,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('titleEn')}</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            dir="ltr"
            placeholder="Amazing Grace"
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
          <Label>{t('artistEn')}</Label>
          <Input
            value={form.artist}
            onChange={(e) => setForm({ ...form, artist: e.target.value })}
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('artistAr')}</Label>
          <Input
            value={form.artist_ar}
            onChange={(e) => setForm({ ...form, artist_ar: e.target.value })}
            dir="rtl"
          />
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('lyricsEn')}</Label>
          <Textarea
            value={form.lyrics}
            onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
            rows={12}
            dir="ltr"
            placeholder={t('lyricsPlaceholder')}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">{t('lyricsHint')}</p>
        </div>
        <div className="space-y-2">
          <Label>{t('lyricsAr')}</Label>
          <Textarea
            value={form.lyrics_ar}
            onChange={(e) => setForm({ ...form, lyrics_ar: e.target.value })}
            rows={12}
            dir="rtl"
            placeholder={t('lyricsPlaceholderAr')}
            className="font-mono text-sm"
          />
        </div>
      </div>

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
