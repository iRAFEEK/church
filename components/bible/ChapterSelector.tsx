'use client'

import { useTranslations, useLocale } from 'next-intl'
import { BIBLE_BOOKS_AR } from '@/lib/bible/constants'
import type { ApiBibleChapter } from '@/types'

interface ChapterSelectorProps {
  bookId: string
  bookName: string
  chapters: ApiBibleChapter[]
  onSelect: (chapterId: string) => void
  onBack: () => void
}

export function ChapterSelector({ bookId, bookName, chapters, onSelect, onBack }: ChapterSelectorProps) {
  const t = useTranslations('bible')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const displayName = isAr && BIBLE_BOOKS_AR[bookId] ? BIBLE_BOOKS_AR[bookId] : bookName

  // Filter out intro chapter (usually "intro" or chapter 0)
  const realChapters = chapters.filter(ch => ch.number !== 'intro')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-primary hover:underline"
        >
          ← {t('back')}
        </button>
        <h2 className="text-lg font-semibold">{displayName}</h2>
      </div>

      <p className="text-sm text-muted-foreground">{t('selectChapter')}</p>

      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {realChapters.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onSelect(ch.id)}
            className="h-10 w-full rounded-lg border text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          >
            {ch.number}
          </button>
        ))}
      </div>
    </div>
  )
}
