'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, Package } from 'lucide-react'
import { NEED_URGENCY_COLORS, NEED_STATUS_COLORS } from '@/lib/design/tokens'
import { timeAgo } from '@/lib/utils/time-ago'
import type { ChurchNeed } from '@/types'

interface MyNeedCardProps {
  need: ChurchNeed & { response_count: number }
}

export function MyNeedCard({ need }: MyNeedCardProps) {
  const t = useTranslations('churchNeeds')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const title = isAr ? (need.title_ar || need.title) : need.title

  return (
    <Link href={`/community/needs/${need.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm leading-tight line-clamp-1">{title}</h3>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge className={`text-xs ${NEED_STATUS_COLORS[need.status]}`} variant="secondary">
                  {t(`statuses.${need.status}`)}
                </Badge>
                <Badge className={`text-xs ${NEED_URGENCY_COLORS[need.urgency]}`} variant="secondary">
                  {t(`urgencies.${need.urgency}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t(`categories.${need.category}`)}
                </Badge>
                {need.quantity > 1 && (
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 me-1" />
                    {need.quantity}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {timeAgo(need.created_at, locale)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm shrink-0">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className={need.response_count > 0 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                {need.response_count}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
