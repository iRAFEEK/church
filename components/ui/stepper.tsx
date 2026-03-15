'use client'

import { useTranslations, useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

export interface StepperStep {
  title: string
  titleAr: string
}

export type StepErrors = Record<string, string>

interface StepperProps {
  steps: StepperStep[]
  currentStep: number
  onNext: () => void
  onBack: () => void
  onSubmit?: () => void
  isSubmitting?: boolean
  submitLabel?: string
  submitLabelAr?: string
  canProceed?: boolean
  /** Called before advancing. Return field errors to block navigation. */
  onValidateStep?: () => StepErrors | null
  children: React.ReactNode
}

export function Stepper({
  steps,
  currentStep,
  onNext,
  onBack,
  onSubmit,
  isSubmitting,
  submitLabel,
  submitLabelAr,
  canProceed = true,
  onValidateStep,
  children,
}: StepperProps) {
  const locale = useLocale()
  const t = useTranslations('common')
  const isRTL = locale.startsWith('ar')
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const BackIcon = isRTL ? ChevronRight : ChevronLeft

  function handleNext() {
    if (onValidateStep) {
      const errors = onValidateStep()
      if (errors && Object.keys(errors).length > 0) return
    }
    onNext()
  }

  function handleSubmit() {
    if (onValidateStep) {
      const errors = onValidateStep()
      if (errors && Object.keys(errors).length > 0) return
    }
    onSubmit?.()
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Progress dots */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-center gap-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                  i < currentStep
                    ? 'bg-green-500 text-white'
                    : i === currentStep
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2'
                      : 'bg-zinc-100 text-zinc-400'
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'w-6 sm:w-10 h-0.5 mx-0.5 transition-colors duration-300',
                    i < currentStep ? 'bg-green-500' : 'bg-zinc-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-medium text-zinc-700 mt-3">
          {isRTL ? steps[currentStep].titleAr : steps[currentStep].title}
        </p>
      </div>

      {/* Step content */}
      <div className="px-4 pb-4 min-h-[200px]">
        {children}
      </div>

      {/* Navigation buttons */}
      <div className="border-t border-zinc-100 px-4 py-4 flex gap-3">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px] flex-1"
            onClick={onBack}
          >
            <BackIcon className="h-4 w-4" />
            <span className="mx-1">{t('back')}</span>
          </Button>
        )}

        {isLastStep ? (
          <Button
            type="button"
            className="min-h-[48px] flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleSubmit}
            disabled={!canProceed || isSubmitting}
          >
            {isSubmitting
              ? t('saving')
              : isRTL
                ? (submitLabelAr || t('confirm'))
                : (submitLabel || t('confirm'))
            }
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-[48px] flex-1"
            onClick={handleNext}
            disabled={!canProceed}
          >
            <span className="mx-1">{t('next')}</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}
