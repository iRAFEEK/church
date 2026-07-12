'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GuideCategory } from '@/lib/help/guide-data'

interface GuideLibraryProps {
  categories: GuideCategory[]
}

/**
 * Calm, low-literacy-friendly library: big icon category cards; one category
 * open at a time; each lesson is a single row that opens its own page.
 */
export function GuideLibrary({ categories }: GuideLibraryProps) {
  const t = useTranslations('helpGuide')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [openId, setOpenId] = useState<string | null>(categories[0]?.id ?? null)

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const open = openId === cat.id
        return (
          <div key={cat.id} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : cat.id)}
              aria-expanded={open}
              className="w-full flex items-center gap-3 px-4 py-4 min-h-[56px] text-start hover:bg-zinc-50 transition-colors"
            >
              <span className="text-3xl" aria-hidden>{cat.icon}</span>
              <span className="flex-1">
                <span className="block font-semibold text-zinc-900" dir="auto">{!isAr && cat.titleEn ? cat.titleEn : cat.title}</span>
                <span className="block text-xs text-zinc-500">{t('lessonCount', { count: cat.lessons.length })}</span>
              </span>
              <ChevronDown className={cn('h-5 w-5 text-zinc-400 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
              <ul className="border-t border-zinc-100">
                {cat.lessons.map((lesson) => {
                  const hasVideo = lesson.steps.some(s => s.vid)
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/help/${lesson.id}`}
                        className="flex items-center gap-3 px-4 py-3 min-h-[52px] hover:bg-amber-50 active:bg-amber-100 transition-colors"
                      >
                        <span className="text-2xl w-8 text-center" aria-hidden>{lesson.icon}</span>
                        <span className="flex-1 text-sm font-medium text-zinc-800" dir={isAr ? 'rtl' : 'auto'}>
                          {!isAr && lesson.titleEn ? lesson.titleEn : lesson.title}
                        </span>
                        {hasVideo && (
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600 shrink-0" aria-label={t('hasVideo')}>
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
