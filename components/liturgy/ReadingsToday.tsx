'use client'

import { useTranslations } from 'next-intl'
import { BookOpen, Calendar } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { ReadingBlock } from '@/components/liturgy/ReadingBlock'
import { SynaxariumCard } from '@/components/liturgy/SynaxariumCard'

import type { LectionaryReading } from '@/types'

type ReadingsTodayProps = {
  reading: LectionaryReading | null
  locale: string
}

type ReadingGroup = {
  type: string
  label: string
  entries: { type: string; reference: string; text_en?: string; text_ar?: string }[]
}

export function ReadingsToday({ reading, locale }: ReadingsTodayProps) {
  const t = useTranslations('Liturgy')

  if (!reading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">{t('noReadings')}</h3>
      </div>
    )
  }

  // Group readings by type (vespers, matins, liturgy, etc.)
  const grouped = reading.readings.reduce<Record<string, ReadingGroup>>((acc, entry) => {
    const groupKey = entry.type.split('_')[0] || entry.type
    if (!acc[groupKey]) {
      acc[groupKey] = { type: groupKey, label: groupKey, entries: [] }
    }
    acc[groupKey].entries.push(entry)
    return acc
  }, {})

  const readingGroups = Object.values(grouped)
  const occasion = locale === 'en' ? reading.occasion : reading.occasion_ar

  return (
    <div className="space-y-4">
      {/* Header with Coptic date and season */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="size-5 text-primary" />
            {t('todaysReadings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reading.coptic_date && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('copticDate')}:
              </span>
              <span className="text-sm font-medium">{reading.coptic_date}</span>
            </div>
          )}
          {reading.season && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('season')}:
              </span>
              <Badge variant="secondary">{reading.season}</Badge>
            </div>
          )}
          {occasion && (
            <p className="text-sm text-muted-foreground">{occasion}</p>
          )}
        </CardContent>
      </Card>

      {/* Reading groups */}
      {readingGroups.map((group) => (
        <div key={group.type} className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider ps-1">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.entries.map((entry, idx) => (
              <ReadingBlock
                key={`${group.type}-${idx}`}
                entry={entry}
                locale={locale}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Synaxarium */}
      {(reading.synaxarium_ar || reading.synaxarium_en) && (
        <SynaxariumCard
          synaxarium_ar={reading.synaxarium_ar}
          synaxarium_en={reading.synaxarium_en}
          locale={locale}
          copticDate={reading.coptic_date}
        />
      )}
    </div>
  )
}
