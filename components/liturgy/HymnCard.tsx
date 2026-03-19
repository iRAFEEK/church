'use client'

import Link from 'next/link'

import { useTranslations } from 'next-intl'
import { Music, Volume2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import type { Hymn } from '@/types'

type HymnCardProps = {
  hymn: Hymn
  locale: string
}

export function HymnCard({ hymn, locale }: HymnCardProps) {
  const t = useTranslations('Liturgy')
  const title = locale === 'en' ? (hymn.title ?? hymn.title_ar) : (hymn.title_ar ?? hymn.title)

  return (
    <Link
      href={`/liturgy/hymns/${hymn.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-3 p-4 min-h-[56px]">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Music className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-medium text-sm leading-tight truncate">
              {title}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {hymn.season && (
                <Badge variant="secondary" className="text-xs">
                  {hymn.season}
                </Badge>
              )}
              {hymn.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          {hymn.audio_url && (
            <div
              className="size-11 flex items-center justify-center shrink-0"
              aria-label={t('play')}
            >
              <Volume2 className="size-4 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
