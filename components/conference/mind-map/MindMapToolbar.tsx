'use client'

import { useReactFlow } from '@xyflow/react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, Maximize2, Minus, Plus, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { SaveIndicator } from './SaveIndicator'
import type { SaveStatus } from './useCanvasPersistence'

interface Props {
  eventId: string
  eventTitle: string
  locale: string
  saveStatus?: SaveStatus
  lastSaved?: Date | null
  onRetrySave?: () => void
}

export function MindMapToolbar({ eventId, eventTitle, locale, saveStatus, lastSaved, onRetrySave }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')
  const { fitView, zoomIn, zoomOut, getZoom } = useReactFlow()
  const [zoom, setZoom] = useState(100)

  // Poll zoom level (React Flow doesn't expose a zoom change event simply)
  useEffect(() => {
    const interval = setInterval(() => {
      const z = getZoom()
      setZoom(Math.round(z * 100))
    }, 300)
    return () => clearInterval(interval)
  }, [getZoom])

  return (
    <div className="flex items-center gap-2 h-12 px-3 bg-white border-b border-zinc-200 z-10 shrink-0">
      {/* Back link */}
      <Link href={`/admin/events/${eventId}`}>
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm h-9">
          <ChevronLeft className={cn('h-4 w-4', isRTL && 'rotate-180')} />
          <span className="hidden sm:inline">{t('backToEvent')}</span>
        </Button>
      </Link>

      <div className="w-px h-5 bg-zinc-200 shrink-0" />

      {/* Title */}
      <p className="flex-1 font-medium text-sm text-zinc-800 truncate max-w-[280px]" dir="auto">
        {eventTitle}
      </p>

      <Badge variant="secondary" className="shrink-0 text-xs hidden sm:flex">
        {t('mode')}
      </Badge>

      {saveStatus && saveStatus !== 'idle' && onRetrySave && (
        <SaveIndicator status={saveStatus} lastSaved={lastSaved ?? null} onRetry={onRetrySave} />
      )}

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => zoomOut({ duration: 200 })}
          aria-label={t('mindMap.zoomOut')}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs text-zinc-600 tabular-nums min-w-[44px] text-center" dir="ltr">
          {zoom}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => zoomIn({ duration: 200 })}
          aria-label={t('mindMap.zoomIn')}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => fitView({ duration: 400, padding: 0.15 })}
          aria-label={t('mindMap.fitView')}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-5 bg-zinc-200 shrink-0" />

      {/* Share / Invite */}
      <Button variant="outline" size="sm" className="gap-1.5 h-9">
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('invite')}</span>
      </Button>
    </div>
  )
}
