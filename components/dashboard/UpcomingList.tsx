'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Heart, CalendarOff } from 'lucide-react'
import type { UpcomingItem } from '@/types/dashboard'

const typeConfig = {
  gathering: { icon: Users, variant: 'default' as const, key: 'upcomingGathering' },
  event: { icon: Calendar, variant: 'secondary' as const, key: 'upcomingEvent' },
  serving_slot: { icon: Heart, variant: 'outline' as const, key: 'upcomingServing' },
}

export function UpcomingList({ items }: { items: UpcomingItem[] }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const isAr = locale === 'ar'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('upcomingTitle')}</CardTitle>
        <CardDescription>{t('upcomingDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <CalendarOff className="h-4 w-4" />
            {t('upcomingEmpty')}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const config = typeConfig[item.type]
              const Icon = config.icon
              const date = new Date(item.datetime)
              const dateStr = date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
              const timeStr = item.type !== 'serving_slot'
                ? date.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                : null

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/60 transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                      {item.subtitle ? ` · ${item.subtitle}` : ''}
                    </p>
                  </div>
                  <Badge variant={config.variant} className="text-xs shrink-0">
                    {t(config.key)}
                  </Badge>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
