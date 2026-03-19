'use client'

import Link from 'next/link'

import { useTranslations } from 'next-intl'
import { ChevronRight, FileText } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

import type { LiturgicalSection } from '@/types'

type SectionListProps = {
  sections: LiturgicalSection[]
  basePath: string
  locale: string
}

export function SectionList({ sections, basePath, locale }: SectionListProps) {
  const t = useTranslations('Liturgy')

  if (!sections || sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">{t('noContent')}</h3>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const title = locale === 'en' ? section.title : section.title_ar
        const description =
          locale === 'en' ? section.description : section.description_ar

        return (
          <Link
            key={section.id}
            href={`${basePath}/${section.slug}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center gap-3 p-4 min-h-[56px]">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm leading-tight truncate">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {description}
                    </p>
                  )}
                </div>
                <ChevronRight className="size-5 text-muted-foreground shrink-0 rtl:rotate-180" />
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
