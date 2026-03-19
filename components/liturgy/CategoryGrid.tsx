'use client'

import Link from 'next/link'

import { useTranslations } from 'next-intl'
import {
  BookOpen,
  Church,
  Clock,
  Cross,
  Music,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

import type { LiturgicalCategory } from '@/types'

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Church,
  Clock,
  Cross,
  Music,
  ScrollText,
}

type CategoryGridProps = {
  categories: LiturgicalCategory[]
  locale: string
}

export function CategoryGrid({ categories, locale }: CategoryGridProps) {
  const t = useTranslations('Liturgy')

  if (!categories || categories.length === 0) {
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {categories.map((category) => {
        const IconComponent = category.icon ? ICON_MAP[category.icon] : BookOpen
        const ResolvedIcon = IconComponent ?? BookOpen
        const name = locale === 'en' ? category.name : category.name_ar

        return (
          <Link
            key={category.id}
            href={`/liturgy/${category.slug}`}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-6 min-h-[120px]">
                <ResolvedIcon className="size-8 text-primary" />
                <span className="text-sm font-medium text-center leading-tight">
                  {name}
                </span>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
