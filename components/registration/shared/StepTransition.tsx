'use client'

import { motion } from 'framer-motion'
import { useLocale } from 'next-intl'

interface StepTransitionProps {
  children: React.ReactNode
  direction: number // 1 = forward, -1 = backward
  stepKey: number
}

export function StepTransition({ children, direction, stepKey }: StepTransitionProps) {
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  // In RTL, "forward" slides from left; in LTR, from right
  const xOffset = isRTL ? -direction * 200 : direction * 200

  return (
    <motion.div
      key={stepKey}
      initial={{ x: xOffset, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -xOffset, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  )
}
