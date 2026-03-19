'use client'

import { useTranslations } from 'next-intl'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { Hymn, LiturgicalLanguage } from '@/types'

type HymnLyricsProps = {
  hymn: Hymn
  locale: string
}

type LyricsTab = {
  lang: LiturgicalLanguage
  label: string
  content: string
}

export function HymnLyrics({ hymn, locale }: HymnLyricsProps) {
  const t = useTranslations('Liturgy')

  const tabs: LyricsTab[] = []

  if (hymn.lyrics_ar) {
    tabs.push({ lang: 'ar', label: t('arabic'), content: hymn.lyrics_ar })
  }
  if (hymn.lyrics_en) {
    tabs.push({ lang: 'en', label: t('english'), content: hymn.lyrics_en })
  }
  if (hymn.lyrics_coptic) {
    tabs.push({ lang: 'coptic', label: t('coptic'), content: hymn.lyrics_coptic })
  }

  // No lyrics available
  if (tabs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {t('noContent')}
      </p>
    )
  }

  // Single language - show directly without tabs
  if (tabs.length === 1) {
    const tab = tabs[0]
    return (
      <div
        className="whitespace-pre-wrap text-base leading-relaxed"
        dir={tab.lang === 'coptic' ? 'ltr' : 'auto'}
      >
        {tab.content}
      </div>
    )
  }

  // Multiple languages - show tabs
  const defaultTab = locale === 'en' && tabs.some((t) => t.lang === 'en')
    ? 'en'
    : tabs[0].lang

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.lang}
            value={tab.lang}
            className="flex-1 h-11"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.lang} value={tab.lang}>
          <div
            className="whitespace-pre-wrap text-base leading-relaxed pt-2"
            dir={tab.lang === 'coptic' ? 'ltr' : 'auto'}
          >
            {tab.content}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
