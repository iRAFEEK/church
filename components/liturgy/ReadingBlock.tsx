'use client'

import { useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import type { LectionaryReadingEntry } from '@/types'

type ReadingBlockProps = {
  entry: LectionaryReadingEntry
  locale: string
}

export function ReadingBlock({ entry, locale }: ReadingBlockProps) {
  const t = useTranslations('Liturgy')
  const text = locale === 'en' ? entry.text_en : entry.text_ar
  const fallbackText = entry.text_ar ?? entry.text_en

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {entry.type}
          </Badge>
          <span className="text-sm font-medium text-primary" dir="ltr">
            {entry.reference}
          </span>
        </div>
        {(text || fallbackText) && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {text ?? fallbackText}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
