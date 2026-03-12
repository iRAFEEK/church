'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ServiceNeedItem {
  id: string
  volunteers_needed: number
  assigned_count: number
  confirmed_count: number
  ministry?: { id: string; name: string; name_ar: string | null }
  group?: { id: string; name: string; name_ar: string | null }
  event: { id: string; title: string; title_ar: string | null; starts_at: string; location: string | null; status: string }
}

export function LeaderServiceNeeds() {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const [needs, setNeeds] = useState<ServiceNeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leader/service-needs')
      .then(r => r.json())
      .then(d => setNeeds(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (needs.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('leaderUpcomingNeeds')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {needs.slice(0, 5).map(need => {
            const eventTitle = isRTL ? (need.event.title_ar || need.event.title) : need.event.title
            const teamName = isRTL
              ? (need.ministry?.name_ar || need.ministry?.name || need.group?.name_ar || need.group?.name)
              : (need.ministry?.name || need.group?.name)
            const date = new Date(need.event.starts_at)
            const ratio = Math.min(need.assigned_count / need.volunteers_needed, 1)

            let statusColor = 'bg-red-100 text-red-700'
            if (need.assigned_count >= need.volunteers_needed) {
              statusColor = 'bg-green-100 text-green-700'
            } else if (need.assigned_count > 0) {
              statusColor = 'bg-yellow-100 text-yellow-700'
            }

            return (
              <Link
                key={need.id}
                href={`/admin/events/${need.event.id}/staffing`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{eventTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {teamName} &middot;{' '}
                    {date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <Badge variant="outline" className={cn('text-xs shrink-0', statusColor)}>
                  {need.assigned_count}/{need.volunteers_needed}
                </Badge>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
