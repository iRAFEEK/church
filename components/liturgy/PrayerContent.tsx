'use client'

import { useTranslations } from 'next-intl'
import { BookOpen, Volume2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import type { LiturgicalContent } from '@/types'

type PrayerContentProps = {
  content: LiturgicalContent[]
  locale: string
}

export function PrayerContent({ content, locale }: PrayerContentProps) {
  const t = useTranslations('Liturgy')

  if (!content || content.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">{t('noContent')}</h3>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {content.map((block) => (
        <ContentBlock key={block.id} block={block} locale={locale} />
      ))}
    </div>
  )
}

type ContentBlockProps = {
  block: LiturgicalContent
  locale: string
}

function ContentBlock({ block, locale }: ContentBlockProps) {
  const t = useTranslations('Liturgy')
  const primaryText = block.body_ar ?? block.body_en
  const secondaryText =
    locale === 'en' ? block.body_ar : block.body_en
  const showSecondary =
    secondaryText && secondaryText !== primaryText

  switch (block.content_type) {
    case 'prayer':
      return (
        <div className="space-y-2">
          {block.title_ar || block.title && (
            <h4 className="font-semibold text-base">
              {locale === 'en' ? block.title : block.title_ar}
            </h4>
          )}
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {locale === 'en' ? block.body_en : primaryText}
          </p>
          {showSecondary && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {secondaryText}
            </p>
          )}
          {block.body_coptic && (
            <p className="text-sm italic text-muted-foreground font-serif whitespace-pre-wrap">
              {block.body_coptic}
            </p>
          )}
        </div>
      )

    case 'response':
      return (
        <div className="ps-4 border-s-2 border-primary/30 space-y-1">
          <p className="text-base italic text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {locale === 'en' ? block.body_en : primaryText}
          </p>
          {showSecondary && (
            <p className="text-sm text-muted-foreground/70 whitespace-pre-wrap">
              {secondaryText}
            </p>
          )}
          {block.body_coptic && (
            <p className="text-xs italic text-muted-foreground/60 font-serif whitespace-pre-wrap">
              {block.body_coptic}
            </p>
          )}
        </div>
      )

    case 'rubric':
    case 'instruction':
      return (
        <div className="bg-muted/50 rounded-md px-4 py-3">
          <p className="text-xs text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
            {locale === 'en' ? block.body_en : primaryText}
          </p>
        </div>
      )

    case 'reading':
      return (
        <Card>
          <CardContent className="p-4 space-y-2">
            {(block.title || block.title_ar) && (
              <h4 className="font-semibold text-sm text-primary">
                {locale === 'en' ? block.title : block.title_ar}
              </h4>
            )}
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {locale === 'en' ? block.body_en : primaryText}
            </p>
            {showSecondary && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {secondaryText}
              </p>
            )}
          </CardContent>
        </Card>
      )

    case 'hymn':
      return (
        <div className="space-y-2">
          {(block.title || block.title_ar) && (
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm flex-1">
                {locale === 'en' ? block.title : block.title_ar}
              </h4>
              {block.audio_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label={t('play')}
                >
                  <Volume2 className="size-4" />
                </Button>
              )}
            </div>
          )}
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {locale === 'en' ? block.body_en : primaryText}
          </p>
          {block.body_coptic && (
            <p className="text-sm italic text-muted-foreground font-serif whitespace-pre-wrap">
              {block.body_coptic}
            </p>
          )}
        </div>
      )

    default:
      return (
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {locale === 'en' ? block.body_en : primaryText}
        </p>
      )
  }
}
