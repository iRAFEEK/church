'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Stepper, type StepErrors } from '@/components/ui/stepper'
import { FieldError, RequiredMark } from '@/components/ui/field-error'
import { toast } from 'sonner'
import { Music, FileText, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Song } from '@/types'

interface SongFormProps {
  song?: Song
}

export function SongForm({ song }: SongFormProps) {
  const router = useRouter()
  const t = useTranslations('songs')
  const tc = useTranslations('common')

  const STEPS = [
    { title: t('stepTitleArtist'), titleAr: t('stepTitleArtist') },
    { title: t('stepLyrics'), titleAr: t('stepLyrics') },
    { title: t('stepTagsReview'), titleAr: t('stepTagsReview') },
  ]
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const tV = useTranslations('validation')
  const [errors, setErrors] = useState<StepErrors>({})

  const [form, setForm] = useState({
    title: song?.title || song?.title_ar || '',
    artist: song?.artist || song?.artist_ar || '',
    lyrics: song?.lyrics || song?.lyrics_ar || '',
    tags: song?.tags?.join(', ') || '',
  })

  const handleSubmit = async () => {
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
        title_ar: form.title,
        artist: form.artist || null,
        artist_ar: form.artist || null,
        lyrics: form.lyrics || null,
        lyrics_ar: form.lyrics || null,
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

  const validateStep = useCallback((): StepErrors | null => {
    const errs: StepErrors = {}
    if (step === 0) {
      if (!form.title.trim()) errs.title = tV('titleRequired')
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error(tV('fixErrors'))
      return errs
    }
    setErrors({})
    return null
  }, [step, form, tV])

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => { setErrors({}); step === 0 ? router.back() : setStep(s => s - 1) }}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={song ? t('updateSong') : t('createSong')}
      submitLabelAr={song ? t('updateSong') : t('createSong')}
      onValidateStep={validateStep}
    >
      {/* Step 1: Title & Artist */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Music className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('title')}<RequiredMark /></span>
            </div>
            <Input
              value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(prev => { const next = { ...prev }; delete next.title; return next }) }}
              dir="auto"
              className={cn('text-lg min-h-[48px]', errors.title && 'border-red-500 focus-visible:ring-red-500')}
            />
            <FieldError error={errors.title} />
          </div>
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Music className="h-5 w-5" />
              <span className="text-sm font-medium">{tc('artist')}</span>
            </div>
            <Input
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              dir="auto"
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
              value={form.lyrics}
              onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
              rows={12}
              dir="auto"
              placeholder={t('lyricsPlaceholder')}
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
              dir="auto"
              className="text-base min-h-[48px]"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('tagsHint')}</p>
          </div>
          <div className="space-y-3 pt-2">
            <ReviewItem icon={<Music className="h-4 w-4" />} label={tc('title')} value={form.title} />
            {form.artist && <ReviewItem icon={<Music className="h-4 w-4" />} label={tc('artist')} value={form.artist} />}
            {form.lyrics && (
              <ReviewItem
                icon={<FileText className="h-4 w-4" />}
                label={tc('lyrics')}
                value={form.lyrics.split('\n').slice(0, 3).join(' / ') + '...'}
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
