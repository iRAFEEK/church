'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WizardProgress } from './WizardProgress'

interface WizardLayoutProps {
  children: React.ReactNode
  currentStep: number
  totalSteps: number
  onBack?: () => void
  showBack?: boolean
}

export function WizardLayout({
  children,
  currentStep,
  totalSteps,
  onBack,
  showBack = false,
}: WizardLayoutProps) {
  const locale = useLocale()
  const t = useTranslations('registration')
  const isRTL = locale.startsWith('ar')
  const BackIcon = isRTL ? ChevronRight : ChevronLeft

  function toggleLanguage() {
    const next = locale.startsWith('ar') ? 'en' : 'ar'
    document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <div className="w-20">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-1 text-muted-foreground"
            >
              <BackIcon className="h-4 w-4" />
              {t('back')}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t('progress', { current: currentStep + 1, total: totalSteps })}
        </p>

        <div className="w-20 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-1.5 text-muted-foreground"
          >
            <Globe className="h-4 w-4" />
            {locale.startsWith('ar') ? 'EN' : 'عربي'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-lg">
          {children}
        </div>
      </div>
    </div>
  )
}
