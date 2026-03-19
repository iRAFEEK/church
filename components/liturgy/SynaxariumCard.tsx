'use client'

import { useState } from 'react'

import { useTranslations } from 'next-intl'
import { BookOpen, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SynaxariumCardProps = {
  synaxarium_ar: string | null
  synaxarium_en: string | null
  locale: string
  copticDate: string | null
}

const TRUNCATE_LENGTH = 300

export function SynaxariumCard({
  synaxarium_ar,
  synaxarium_en,
  locale,
  copticDate,
}: SynaxariumCardProps) {
  const t = useTranslations('Liturgy')
  const [isExpanded, setIsExpanded] = useState(false)

  const text = locale === 'en' ? (synaxarium_en ?? synaxarium_ar) : (synaxarium_ar ?? synaxarium_en)

  if (!text) return null

  const isLong = text.length > TRUNCATE_LENGTH
  const displayText = isLong && !isExpanded
    ? text.slice(0, TRUNCATE_LENGTH) + '...'
    : text

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="size-5 text-primary" />
          {t('synaxarium')}
        </CardTitle>
        {copticDate && (
          <p className="text-xs text-muted-foreground">{copticDate}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown
              className={`size-4 me-1 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
            {isExpanded ? t('showLess') : t('showMore')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
