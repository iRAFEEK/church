'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

import type { LiturgicalLanguage } from '@/types'

type ContentLanguageToggleProps = {
  available: LiturgicalLanguage[]
  selected: LiturgicalLanguage
  onChange: (lang: LiturgicalLanguage) => void
}

const LANGUAGE_LABELS: Record<LiturgicalLanguage, string> = {
  ar: 'arabic',
  en: 'english',
  coptic: 'coptic',
}

export function ContentLanguageToggle({
  available,
  selected,
  onChange,
}: ContentLanguageToggleProps) {
  const t = useTranslations('Liturgy')

  if (available.length <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {available.map((lang) => (
        <Button
          key={lang}
          variant={selected === lang ? 'default' : 'ghost'}
          size="sm"
          className="h-9 min-w-[64px] text-xs"
          onClick={() => onChange(lang)}
        >
          {t(LANGUAGE_LABELS[lang])}
        </Button>
      ))}
    </div>
  )
}
