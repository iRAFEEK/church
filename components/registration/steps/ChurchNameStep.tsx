'use client'

import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { Church } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChurchNameStepProps {
  churchNameAr: string
  churchNameEn: string
  onUpdate: (fields: { churchNameAr?: string; churchNameEn?: string }) => void
  onNext: () => void
}

export function ChurchNameStep({
  churchNameAr,
  churchNameEn,
  onUpdate,
  onNext,
}: ChurchNameStepProps) {
  const t = useTranslations('registration.step2')
  const locale = useLocale()
  const displayName = locale === 'ar'
    ? churchNameAr || t('previewPlaceholder')
    : churchNameEn || churchNameAr || t('previewPlaceholder')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <Church className="h-7 w-7 text-amber-500" />
        </motion.div>
        <h2 className="text-2xl font-bold tracking-tight">{t('headline')}</h2>
        <p className="text-muted-foreground text-sm">{t('subheadline')}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('nameArLabel')}</label>
          <Input
            placeholder={t('nameArPlaceholder')}
            value={churchNameAr}
            onChange={(e) => onUpdate({ churchNameAr: e.target.value })}
            className="h-13 text-base text-lg"
            dir="rtl"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{t('nameEnLabel')}</label>
            <span className="text-xs text-muted-foreground">({t('nameEnOptional')})</span>
          </div>
          <Input
            placeholder={t('nameEnPlaceholder')}
            value={churchNameEn}
            onChange={(e) => onUpdate({ churchNameEn: e.target.value })}
            className="h-13 text-base"
            dir="ltr"
          />
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">{t('previewLabel')}</p>
        <motion.div
          layout
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">
                {(churchNameAr || churchNameEn || 'E')[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground">Ekklesia</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Continue */}
      <Button
        size="lg"
        className="w-full h-13 text-base rounded-full"
        onClick={onNext}
        disabled={!churchNameAr.trim()}
      >
        {t('continue') || 'Continue'}
      </Button>
    </div>
  )
}
