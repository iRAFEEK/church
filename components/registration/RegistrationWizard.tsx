'use client'

import { useState } from 'react'
import { LazyMotion, domAnimation, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

import { WizardLayout } from './shared/WizardLayout'
import { StepTransition } from './shared/StepTransition'
import { WelcomeStep } from './steps/WelcomeStep'
import { AccountStep } from './steps/AccountStep'
import { ChurchNameStep } from './steps/ChurchNameStep'
import { ChurchDetailsStep } from './steps/ChurchDetailsStep'
import { PersonalizeStep } from './steps/PersonalizeStep'
import { LeadersStep, type LeaderEntry } from './steps/LeadersStep'
import { CompletionStep } from './steps/CompletionStep'
import { MIDDLE_EAST_COUNTRIES } from './shared/CountryTimezoneMap'

// Steps: 0=Welcome, 1=Account, 2=ChurchName, 3=ChurchDetails, 4=Personalize, 5=Leaders, 6=Completion
const TOTAL_STEPS = 7

interface WizardState {
  email: string
  password: string
  confirmPassword: string
  churchNameAr: string
  churchNameEn: string
  country: string
  timezone: string
  primaryLanguage: 'ar' | 'en'
  denomination: string
  defaultBibleId: string
  welcomeMessage: string
  leaders: LeaderEntry[]
}

export function RegistrationWizard() {
  const t = useTranslations('registration')
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accountError, setAccountError] = useState('')

  const [state, setState] = useState<WizardState>({
    email: '',
    password: '',
    confirmPassword: '',
    churchNameAr: '',
    churchNameEn: '',
    country: '',
    timezone: '',
    primaryLanguage: 'ar',
    denomination: '',
    defaultBibleId: 'ar-svd',
    welcomeMessage: '',
    leaders: [],
  })

  function update(fields: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...fields }))
  }

  function goNext() {
    setDirection(1)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  function goBack() {
    setDirection(-1)
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setAccountError('')

    try {
      const res = await fetch('/api/churches/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
          churchNameAr: state.churchNameAr,
          churchNameEn: state.churchNameEn || undefined,
          country: state.country,
          timezone: state.timezone,
          primaryLanguage: state.primaryLanguage,
          denomination: state.denomination || undefined,
          defaultBibleId: state.defaultBibleId,
          welcomeMessage: state.welcomeMessage || undefined,
          leaders: state.leaders.length > 0 ? state.leaders : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setAccountError(data.error || t('step1.emailExists'))
          setDirection(-1)
          setStep(1)
          setIsSubmitting(false)
          return
        }
        throw new Error(data.error || 'Registration failed')
      }

      // Sign in to establish browser session (non-blocking)
      try {
        const supabase = createClient()
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: state.email,
          password: state.password,
        })
        if (signInError) {
          // Auto sign-in failed — user can sign in manually
        }
      } catch {
        // Auto sign-in network error — user can sign in manually
      }

      // Move to completion step
      setDirection(1)
      setStep(6)
    } catch {
      toast.error(t('errorGeneric'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit happens after leaders step (the last data step)
  function handleLeadersNext() {
    handleSubmit()
  }

  function handleLeadersSkip() {
    update({ leaders: [] })
    handleSubmit()
  }

  // Get display country name for completion
  const countryObj = MIDDLE_EAST_COUNTRIES.find((c) => c.code === state.country)
  const countryDisplay = countryObj
    ? `${countryObj.flag} ${countryObj.name}`
    : state.country

  function renderStep() {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={goNext} />
      case 1:
        return (
          <AccountStep
            email={state.email}
            password={state.password}
            confirmPassword={state.confirmPassword}
            onUpdate={update}
            onNext={goNext}
            error={accountError}
          />
        )
      case 2:
        return (
          <ChurchNameStep
            churchNameAr={state.churchNameAr}
            churchNameEn={state.churchNameEn}
            onUpdate={update}
            onNext={goNext}
          />
        )
      case 3:
        return (
          <ChurchDetailsStep
            country={state.country}
            timezone={state.timezone}
            primaryLanguage={state.primaryLanguage}
            denomination={state.denomination}
            defaultBibleId={state.defaultBibleId}
            onUpdate={update}
            onNext={goNext}
          />
        )
      case 4:
        return (
          <PersonalizeStep
            welcomeMessage={state.welcomeMessage}
            onUpdate={update}
            onNext={goNext}
            onSkip={goNext}
          />
        )
      case 5:
        return (
          <LeadersStep
            leaders={state.leaders}
            onUpdate={(leaders) => update({ leaders })}
            onNext={handleLeadersNext}
            onSkip={handleLeadersSkip}
          />
        )
      case 6:
        return (
          <CompletionStep
            churchName={state.churchNameAr}
            email={state.email}
            country={countryDisplay}
          />
        )
      default:
        return null
    }
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <WizardLayout
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={goBack}
        showBack={step > 0 && step < 6}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <StepTransition key={step} direction={direction} stepKey={step}>
            {renderStep()}
          </StepTransition>
        </AnimatePresence>

        {/* Loading overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">{t('creating')}</p>
            </div>
          </div>
        )}
      </WizardLayout>
    </LazyMotion>
  )
}
