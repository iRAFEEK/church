'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users } from 'lucide-react'

interface ServingSlotCardProps {
  slot: any
  admin?: boolean
}

export function ServingSlotCard({ slot, admin }: ServingSlotCardProps) {
  const t = useTranslations('serving')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const title = isAr ? (slot.title_ar || slot.title) : slot.title
  const areaName = slot.serving_areas
    ? (isAr ? (slot.serving_areas.name_ar || slot.serving_areas.name) : slot.serving_areas.name)
    : null

  const href = admin
    ? `/admin/serving/slots/${slot.id}`
    : `/serving/${slot.id}`

  const isFull = slot.max_volunteers && slot.signup_count >= slot.max_volunteers

  return (
    <Link href={href} className="block p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{title}</p>
          {areaName && (
            <p className="text-xs text-muted-foreground mt-0.5">{areaName}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(slot.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
            </span>
            {slot.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {slot.start_time.slice(0, 5)}{slot.end_time ? ` – ${slot.end_time.slice(0, 5)}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={isFull ? 'destructive' : 'secondary'} className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {slot.signup_count}{slot.max_volunteers ? `/${slot.max_volunteers}` : ''}
          </Badge>
          {isFull && <Badge variant="outline">{t('full')}</Badge>}
        </div>
      </div>
    </Link>
  )
}
