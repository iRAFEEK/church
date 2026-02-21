'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { ServingArea } from '@/types'

interface ServingAreaCardProps {
  area: ServingArea & { ministries?: { name: string; name_ar: string | null } | null }
  admin?: boolean
}

export function ServingAreaCard({ area, admin }: ServingAreaCardProps) {
  const t = useTranslations('serving')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const name = isAr ? (area.name_ar || area.name) : area.name
  const description = isAr ? (area.description_ar || area.description) : area.description
  const ministryName = area.ministries
    ? (isAr ? (area.ministries.name_ar || area.ministries.name) : area.ministries.name)
    : null

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{name}</p>
          {!area.is_active && (
            <Badge variant="secondary">{t('inactive')}</Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{description}</p>
        )}
        {ministryName && (
          <p className="text-xs text-muted-foreground mt-1">{t('ministry')}: {ministryName}</p>
        )}
      </div>
      {admin && (
        <Link
          href={`/admin/serving/areas/${area.id}/edit`}
          className="text-sm text-primary hover:underline shrink-0"
        >
          {t('edit')}
        </Link>
      )}
    </div>
  )
}
