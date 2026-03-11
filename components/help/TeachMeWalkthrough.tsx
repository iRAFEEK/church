'use client'

import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { DriverStep } from '@/lib/help/registry'

interface TeachMeWalkthroughProps {
  steps: DriverStep[]
  isAr: boolean
  onComplete: () => void
}

export function TeachMeWalkthrough({ steps, isAr, onComplete }: TeachMeWalkthroughProps) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'ekklesia-popover',
      nextBtnText: isAr ? 'التالي' : 'Next',
      prevBtnText: isAr ? 'السابق' : 'Previous',
      doneBtnText: isAr ? 'تم' : 'Done',
      onDestroyed: onComplete,
      steps: steps.map(step => ({
        element: step.element,
        popover: {
          title: isAr ? step.titleAr : step.title,
          description: isAr ? step.descriptionAr : step.description,
        },
      })),
    })

    // Small delay to let the help card close animation finish
    const timer = setTimeout(() => driverObj.drive(), 200)
    return () => {
      clearTimeout(timer)
      driverObj.destroy()
    }
  }, [steps, isAr, onComplete])

  return null
}
