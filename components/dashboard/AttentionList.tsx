'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, UserX, Users, CheckCircle2 } from 'lucide-react'
import type { AttentionItem } from '@/types/dashboard'

const typeConfig = {
  visitor_sla: { icon: AlertTriangle, color: 'border-l-red-500', iconColor: 'text-red-500' },
  at_risk_member: { icon: UserX, color: 'border-l-orange-500', iconColor: 'text-orange-500' },
  unfilled_slot: { icon: Users, color: 'border-l-yellow-500', iconColor: 'text-yellow-500' },
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  const t = useTranslations('dashboard')

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
                  className={`flex items-center gap-3 p-2.5 rounded-md border-l-4 ${config.color} bg-muted/30 hover:bg-muted/60 transition-colors`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${config.iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sublabel}</p>
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
