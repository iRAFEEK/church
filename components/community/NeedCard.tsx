'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Clock, Package } from 'lucide-react'
import { NEED_URGENCY_COLORS, NEED_CATEGORY_COLORS } from '@/lib/design/tokens'
import { timeAgo } from '@/lib/utils/time-ago'
import type { ChurchNeedWithChurch } from '@/types'

interface NeedCardProps {
  need: ChurchNeedWithChurch
}

export function NeedCard({ need }: NeedCardProps) {
  const t = useTranslations('churchNeeds')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const title = isAr ? (need.title_ar || need.title) : need.title
  const description = isAr ? (need.description_ar || need.description) : need.description
  const churchName = isAr ? (need.church?.name_ar || need.church?.name) : need.church?.name

  return (
    <Link href={`/community/needs/${need.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        {need.image_url && (
          <div className="h-40 overflow-hidden bg-muted">
            <img
              src={need.image_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className={need.image_url ? 'pt-3' : 'pt-4'}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">{title}</h3>
            <Badge className={`shrink-0 text-xs ${NEED_URGENCY_COLORS[need.urgency]}`} variant="secondary">
              {t(`urgencies.${need.urgency}`)}
            </Badge>
          </div>

          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge className={`text-xs ${NEED_CATEGORY_COLORS[need.category]}`} variant="secondary">
              {t(`categories.${need.category}`)}
            </Badge>
            {need.quantity > 1 && (
              <Badge variant="outline" className="text-xs">
                <Package className="h-3 w-3 me-1" />
                {need.quantity}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1 min-w-0">
              {need.church?.logo_url && (
                <img
                  src={need.church.logo_url}
                  alt=""
                  className="h-4 w-4 rounded-full object-cover shrink-0"
                />
              )}
              <span className="truncate">{churchName}</span>
              {need.church?.country && (
                <>
                  <MapPin className="h-3 w-3 shrink-0 ms-1" />
                  <span className="shrink-0">{need.church.country}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ms-2">
              <Clock className="h-3 w-3" />
              <span>{timeAgo(need.created_at, locale)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
