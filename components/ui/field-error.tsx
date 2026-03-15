'use client'

import { cn } from '@/lib/utils'

interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null
  return (
    <p className={cn('text-xs text-red-500 mt-1', className)}>
      {error}
    </p>
  )
}

export function RequiredMark() {
  return <span className="text-red-500 ms-0.5">*</span>
}
