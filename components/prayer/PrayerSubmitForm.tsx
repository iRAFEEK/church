'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, Globe, EyeOff, Lock } from 'lucide-react'
import { toast } from 'sonner'

type Visibility = 'public' | 'anonymous' | 'private'

type PrayerSubmitFormProps = {
  onSubmitted?: () => void
}

export function PrayerSubmitForm({ onSubmitted }: PrayerSubmitFormProps) {
  const t = useTranslations('churchPrayer')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/church-prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          is_anonymous: visibility === 'anonymous',
          is_private: visibility === 'private',
        }),
      })

      if (res.ok) {
        setContent('')
        setVisibility('public')
        setSubmitted(true)
        toast.success(t('submitted'))
        onSubmitted?.()
        setTimeout(() => setSubmitted(false), 3000)
      } else {
        toast.error(t('error.submit'))
      }
    } catch {
      toast.error(t('error.submit'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2 text-green-700">
            <CheckCircle2 className="h-10 w-10" />
            <p className="text-sm font-medium">{t('submitted')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const visibilityOptions: { value: Visibility; icon: typeof Globe; labelKey: string; hintKey: string }[] = [
    { value: 'public', icon: Globe, labelKey: 'visibilityPublic', hintKey: 'visibilityPublicHint' },
    { value: 'anonymous', icon: EyeOff, labelKey: 'visibilityAnonymous', hintKey: 'visibilityAnonymousHint' },
    { value: 'private', icon: Lock, labelKey: 'visibilityPrivate', hintKey: 'visibilityPrivateHint' },
  ]

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prayer-content" className="text-sm font-medium">
              {t('whatToPrayFor')}
            </Label>
            <Textarea
              id="prayer-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('contentPlaceholder')}
              rows={3}
              required
              dir="auto"
              className="text-base resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-zinc-500">
              {t('visibility')}
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {visibilityOptions.map(({ value, icon: Icon, labelKey, hintKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVisibility(value)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-start transition-colors ${
                    visibility === value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100'
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 ${visibility === value ? 'text-primary' : 'text-zinc-400'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${visibility === value ? 'text-primary' : 'text-zinc-700'}`}>
                      {t(labelKey)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t(hintKey)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="w-full h-11"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t('submitButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
