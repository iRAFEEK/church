'use client'

import { useTranslations, useLocale } from 'next-intl'
import { m } from 'framer-motion'
import { MessageSquareHeart } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PersonalizeStepProps {
  welcomeMessage: string
  onUpdate: (fields: { welcomeMessage?: string }) => void
  onNext: () => void
  onSkip: () => void
}

export function PersonalizeStep({
  welcomeMessage,
  onUpdate,
  onNext,
  onSkip,
}: PersonalizeStepProps) {
  const t = useTranslations('registration.step4')
  const locale = useLocale()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <m.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <MessageSquareHeart className="h-7 w-7 text-rose-500" />
        </m.div>
        <h2 className="text-2xl font-bold tracking-tight">{t('headline')}</h2>
        <p className="text-muted-foreground text-sm">{t('subheadline')}</p>
      </div>

      {/* Textarea */}
      <div className="space-y-1.5">
        <textarea
          placeholder={t('messagePlaceholder')}
          value={welcomeMessage}
          onChange={(e) => onUpdate({ welcomeMessage: e.target.value })}
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 placeholder:text-muted-foreground"
        />
      </div>

      {/* Phone preview */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">{t('previewLabel')}</p>
        <div className="mx-auto max-w-[240px]">
          <div className="rounded-2xl border-2 border-border bg-card p-4 shadow-sm">
            {/* Phone status bar mockup */}
            <div className="flex items-center justify-between mb-4">
              <div className="h-2 w-8 rounded bg-muted" />
              <div className="h-2 w-2 rounded-full bg-muted" />
            </div>
            {/* Content */}
            <div className="text-center space-y-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 mx-auto" />
              <div className="h-2.5 w-20 rounded bg-muted mx-auto" />
              <p className="text-xs text-muted-foreground leading-relaxed min-h-[40px]">
                {welcomeMessage || t('messagePlaceholder')}
              </p>
              <div className="h-6 w-full rounded bg-muted mt-3" />
              <div className="h-6 w-full rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full h-13 text-base rounded-full"
          onClick={onNext}
        >
          {t('continue') || 'Continue'}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onSkip}
        >
          {t('skip')}
        </Button>
      </div>
    </div>
  )
}
