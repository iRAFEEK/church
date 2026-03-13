'use client'

import { m } from 'framer-motion'

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="fixed top-0 inset-x-0 z-50 h-1 bg-muted">
      <m.div
        className="h-full bg-primary rounded-e-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}
