'use client'

import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { MapPin, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MIDDLE_EAST_COUNTRIES, DENOMINATIONS, BIBLE_TRANSLATIONS, type Country } from '../shared/CountryTimezoneMap'
import { cn } from '@/lib/utils'

interface ChurchDetailsStepProps {
  country: string
  timezone: string
  primaryLanguage: 'ar' | 'en'
  denomination: string
  defaultBibleId: string
  onUpdate: (fields: { country?: string; timezone?: string; primaryLanguage?: 'ar' | 'en'; denomination?: string; defaultBibleId?: string }) => void
  onNext: () => void
}

export function ChurchDetailsStep({
  country,
  timezone,
  primaryLanguage,
  denomination,
  defaultBibleId,
  onUpdate,
  onNext,
}: ChurchDetailsStepProps) {
  const t = useTranslations('registration.step3')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  function selectCountry(c: Country) {
    onUpdate({ country: c.code, timezone: c.timezone })
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <MapPin className="h-7 w-7 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-bold tracking-tight">{t('headline')}</h2>
        <p className="text-muted-foreground text-sm">{t('subheadline')}</p>
      </div>

      {/* Country grid */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t('countryLabel')}</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MIDDLE_EAST_COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => selectCountry(c)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all',
                country === c.code
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <span className="text-2xl">{c.flag}</span>
              <span className="text-xs font-medium leading-tight">
                {isRTL ? c.nameAr : c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Denomination */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t('denominationLabel')}</label>
        <div className="flex flex-wrap gap-2">
          {DENOMINATIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onUpdate({ denomination: d.id })}
              className={cn(
                'px-3 py-2 rounded-full border text-sm transition-all',
                denomination === d.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary font-medium'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              {isRTL ? d.nameAr : d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone chip */}
      {timezone && (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('timezoneLabel')}</label>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
            <span className="text-muted-foreground">🕐</span>
            <span dir="ltr">{timezone}</span>
          </div>
        </div>
      )}

      {/* Language toggle */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t('languageLabel')}</label>
        <div className="grid grid-cols-2 gap-3">
          {(['ar', 'en'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onUpdate({ primaryLanguage: lang })}
              className={cn(
                'p-4 rounded-xl border text-center transition-all',
                primaryLanguage === lang
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <p className="text-lg font-semibold">{lang.startsWith('ar') ? 'عربي' : 'English'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(lang.startsWith('ar') ? 'languageAr' : 'languageEn')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Default Bible translation */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t('bibleLabel')}</label>
        <div className="space-y-2">
          {BIBLE_TRANSLATIONS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onUpdate({ defaultBibleId: b.id })}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border text-start transition-all',
                defaultBibleId === b.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                defaultBibleId === b.id ? 'bg-primary/10' : 'bg-muted'
              )}>
                <BookOpen className={cn('h-4 w-4', defaultBibleId === b.id ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{isRTL ? b.nameAr : b.name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.language === 'ar' ? (isRTL ? 'عربي' : 'Arabic') : (isRTL ? 'إنجليزي' : 'English')}
                  {' · '}
                  {isRTL ? `${b.books} سفراً` : `${b.books} books`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Continue */}
      <Button
        size="lg"
        className="w-full h-13 text-base rounded-full"
        onClick={onNext}
        disabled={!country}
      >
        {t('continue') || 'Continue'}
      </Button>
    </div>
  )
}
