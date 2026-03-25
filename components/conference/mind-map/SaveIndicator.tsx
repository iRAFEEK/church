'use client'

import { Check, Loader2, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { SaveStatus } from './useCanvasPersistence'

interface SaveIndicatorProps {
  status: SaveStatus
  lastSaved: Date | null
  onRetry: () => void
}

export function SaveIndicator({ status, lastSaved, onRetry }: SaveIndicatorProps) {
  const t = useTranslations('conference')

  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('canvas.saving')}
      </span>
    )
  }

  if (status === 'saved' && lastSaved) {
    const time = lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return (
      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Check className="h-3 w-3" />
        {t('canvas.saved', { time })}
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500">
        <AlertCircle className="h-3 w-3" />
        {t('canvas.saveFailed')}
        <button
          onClick={onRetry}
          className="underline hover:no-underline ms-1"
        >
          {t('canvas.retry')}
        </button>
      </span>
    )
  }

  return null
}
