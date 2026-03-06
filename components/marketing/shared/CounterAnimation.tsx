'use client'

import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

interface CounterAnimationProps {
  target: number
  suffix?: string
  prefix?: string
  duration?: number
}

export function CounterAnimation({
  target,
  suffix = '',
  prefix = '',
  duration = 2,
}: CounterAnimationProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!isInView) return

    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(Math.round(v)),
    })

    return controls.stop
  }, [isInView, target, duration])

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}
