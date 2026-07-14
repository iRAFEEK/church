'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, UserX, UserPlus, CheckCircle2, HandHeart, MapPin } from 'lucide-react'
import type { AttentionItem } from '@/types/dashboard'

const typeConfig: Record<AttentionItem['type'], { icon: typeof AlertTriangle; color: string; iconColor: string }> = {
  visitor_sla: { icon: AlertTriangle, color: 'border-s-red-500', iconColor: 'text-red-500' },
  at_risk_member: { icon: UserX, color: 'border-s-orange-500', iconColor: 'text-orange-500' },
  unfilled_slot: { icon: UserPlus, color: 'border-s-yellow-500', iconColor: 'text-yellow-500' },
  active_prayer: { icon: HandHeart, color: 'border-s-blue-500', iconColor: 'text-blue-500' },
  outreach_followup: { icon: MapPin, color: 'border-s-purple-500', iconColor: 'text-purple-500' },
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  // Structured items ({type, params}) are translated here at render time.
  // Items without params (legacy emitters) fall back to their raw strings.
  const renderLabel = (item: AttentionItem): string => {
    if (!item.params) return item.label
    switch (item.type) {
      case 'active_prayer':
        return t('attentionPrayerLabel', { count: item.params.count ?? 0 })
      case 'outreach_followup':
        return t('attentionOutreachLabel')
      default: {
        const name = isAr ? (item.nameAr || item.name) : item.name
        return name || item.label
      }
    }
  }

  const renderSublabel = (item: AttentionItem): string => {
    if (!item.params) return item.sublabel
    switch (item.type) {
      case 'visitor_sla':
        return item.params.noLeader
          ? t('attentionVisitorWaitingNoLeader', { days: item.params.days ?? 0 })
          : t('attentionVisitorWaiting', { days: item.params.days ?? 0 })
      case 'at_risk_member':
        return t('attentionAtRiskSublabel')
      case 'unfilled_slot':
        return t('attentionSlotFill', {
          filled: item.params.filled ?? 0,
          needed: item.params.needed ?? 0,
        })
      case 'active_prayer':
        return t('attentionPrayerSublabel')
      case 'outreach_followup':
        return t('attentionOutreachSublabel', { count: item.params.count ?? 0 })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('attentionTitle')}</CardTitle>
        <CardDescription>{t('attentionDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
            <CheckCircle2 className="h-4 w-4" />
            {t('attentionEmpty')}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const config = typeConfig[item.type]
              const Icon = config.icon
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className={`flex items-center gap-3 p-2.5 min-h-11 rounded-md border-s-4 ${config.color} bg-muted/30 hover:bg-muted/60 transition-colors`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${config.iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{renderLabel(item)}</p>
                    <p className="text-xs text-muted-foreground">{renderSublabel(item)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
