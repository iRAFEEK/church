'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { X, Play } from 'lucide-react'
import type { HelpItem } from '@/lib/help/registry'

interface HelpCardProps {
  item: HelpItem
  onClose: () => void
  onWalkthrough?: () => void
}

export function HelpCard({ item, onClose, onWalkthrough }: HelpCardProps) {
  const locale = useLocale()
  const t = useTranslations('help')
  const isAr = locale.startsWith('ar')

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 w-full sm:max-w-md mx-4 mb-4 sm:mb-0 rounded-xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-base">
            {isAr ? item.titleAr : item.title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {item.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr ? step.textAr : step.text}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          {item.driverSteps && item.driverSteps.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                onClose()
                onWalkthrough?.()
              }}
            >
              <Play className="h-3.5 w-3.5" />
              {t('walkMeThrough')}
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1"
            onClick={onClose}
          >
            {t('gotIt')}
          </Button>
        </div>
      </div>
    </div>
  )
}
