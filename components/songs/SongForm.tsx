'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Stepper } from '@/components/ui/stepper'
import { toast } from 'sonner'
import { Music, FileText, Tag } from 'lucide-react'
import type { Song } from '@/types'

interface SongFormProps {
  song?: Song
}

const STEPS = [
  { title: 'Title & Artist', titleAr: 'العنوان والفنان' },
  { title: 'Lyrics', titleAr: 'الكلمات' },
  { title: 'Tags & Review', titleAr: 'التصنيفات والمراجعة' },
]

export function SongForm({ song }: SongFormProps) {
  const router = useRouter()
  const t = useTranslations('songs')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

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

  const handleSubmit = async () => {
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

  const canProceed = step === 0 ? !!form[titleField] : true

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => step === 0 ? router.back() : setStep(s => s - 1)}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={song ? t('updateSong') : t('createSong')}
      submitLabelAr={song ? t('updateSong') : t('createSong')}
      canProceed={canProceed}
    >
      {/* Step 1: Title & Artist */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Music className="h-5 w-5" />
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
            <Label className="text-sm text-zinc-500 mb-1 block">{tc('title')} ({isAr ? 'EN' : 'AR'})</Label>
            <Input
              value={form[titleAltField]}
              onChange={(e) => setForm({ ...form, [titleAltField]: e.target.value })}
              dir={isAr ? 'ltr' : 'rtl'}
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{tc('artist')}</Label>
            <Input
              value={form[artistField]}
              onChange={(e) => setForm({ ...form, [artistField]: e.target.value })}
              dir={isAr ? 'rtl' : 'ltr'}
              className="min-h-[48px]"
            />
          </div>
        </div>
      )}

      {/* Step 2: Lyrics */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('lyrics')}</span>
            </div>
            <Textarea
              value={form[lyricsField]}
              onChange={(e) => setForm({ ...form, [lyricsField]: e.target.value })}
              rows={12}
              dir={isAr ? 'rtl' : 'ltr'}
              placeholder={isAr ? t('lyricsPlaceholderAr') : t('lyricsPlaceholder')}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{tc('lyrics')} ({isAr ? 'EN' : 'AR'})</Label>
            <Textarea
              value={form[lyricsAltField]}
              onChange={(e) => setForm({ ...form, [lyricsAltField]: e.target.value })}
              rows={8}
              dir={isAr ? 'ltr' : 'rtl'}
              className="font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 3: Tags & Review */}
      {step === 2 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Tag className="h-5 w-5" />
              <span className="text-sm font-medium">{t('tagsLabel')}</span>
            </div>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder={t('tagsPlaceholder')}
              dir="ltr"
              className="min-h-[48px]"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('tagsHint')}</p>
          </div>
          <div className="space-y-3 pt-2">
            <ReviewItem icon={<Music className="h-4 w-4" />} label={tc('title')} value={form[titleField]} />
            {form[artistField] && <ReviewItem icon={<Music className="h-4 w-4" />} label={tc('artist')} value={form[artistField]} />}
            {form[lyricsField] && (
              <ReviewItem
                icon={<FileText className="h-4 w-4" />}
                label={tc('lyrics')}
                value={form[lyricsField].split('\n').slice(0, 3).join(' / ') + '...'}
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
