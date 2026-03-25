'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Users, AlertTriangle, Megaphone, CheckCircle2, LogOut, XCircle } from 'lucide-react'
import { CheckinProgressBar } from './CheckinProgressBar'
import { ConferenceAlertFeed } from './ConferenceAlertFeed'
import { cn } from '@/lib/utils'

interface TotalStats {
  total: number
  checked_in: number
  checked_out: number
  no_show: number
}

interface Props {
  eventId: string
  churchId: string
  totalStats: TotalStats
  areas: Array<{ id: string; name: string; name_ar: string | null }>
  blockedTasks: Array<{ id: string; title: string; team: { name: string; name_ar: string | null } | null }>
  recentBroadcasts: Array<{
    id: string
    message: string
    message_ar: string | null
    is_urgent: boolean
    scope: string
    created_at: string
    sender: { first_name: string; last_name: string; first_name_ar?: string | null; last_name_ar?: string | null } | null
  }>
  locale: string
}

export function ConferenceMissionControl({
  eventId,
  churchId,
  totalStats: initialStats,
  areas,
  blockedTasks,
  recentBroadcasts,
  locale,
}: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')
  const [stats, setStats] = useState<TotalStats>(initialStats)

  // Realtime subscription: recount on any member checkin change
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`missioncontrol-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conference_team_members',
          filter: `event_id=eq.${eventId}`,
        },
        async () => {
          // Refetch stats
          const { data } = await supabase
            .from('conference_team_members')
            .select('checkin_status')
            .eq('event_id', eventId)
            .eq('church_id', churchId)
            .limit(5000)

          if (!data) return
          const newStats = { total: 0, checked_in: 0, checked_out: 0, no_show: 0 }
          for (const m of data) {
            newStats.total++
            if (m.checkin_status === 'checked_in') newStats.checked_in++
            if (m.checkin_status === 'checked_out') newStats.checked_out++
            if (m.checkin_status === 'no_show') newStats.no_show++
          }
          setStats(newStats)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, churchId])

  const statCards = [
    { icon: Users, label: t('totalVolunteers'), value: stats.total, color: 'text-zinc-600' },
    { icon: CheckCircle2, label: t('checkedIn'), value: stats.checked_in, color: 'text-green-600' },
    { icon: LogOut, label: t('checkedOut'), value: stats.checked_out, color: 'text-blue-600' },
    { icon: XCircle, label: t('noShow'), value: stats.no_show, color: 'text-red-500' },
  ]

  const getSenderName = (sender: Props['recentBroadcasts'][0]['sender']) => {
    if (!sender) return '—'
    if (isRTL && (sender.first_name_ar || sender.last_name_ar)) {
      return `${sender.first_name_ar || ''} ${sender.last_name_ar || ''}`.trim()
    }
    return `${sender.first_name} ${sender.last_name}`.trim()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t('dashboard')}</h2>

      {/* Stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('h-4 w-4', color)} />
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
              <p className={cn('text-2xl font-bold', color)} dir="ltr">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-area progress */}
      {areas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">{t('allAreasLabel')}</h3>
          {areas.map((area) => (
            <CheckinProgressBar
              key={area.id}
              eventId={eventId}
              churchId={churchId}
              areaId={area.id}
              areaName={isRTL ? (area.name_ar || area.name) : area.name}
              locale={locale}
            />
          ))}
        </div>
      )}

      {/* Alerts + Recent broadcasts side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConferenceAlertFeed blockedTasks={blockedTasks} locale={locale} />

        {/* Recent broadcasts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              {t('recentBroadcastsLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBroadcasts.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('noBroadcasts')}</p>
            )}
            {recentBroadcasts.map((bc) => (
              <div
                key={bc.id}
                className={cn(
                  'rounded-lg border p-3 space-y-1',
                  bc.is_urgent && 'border-red-200 bg-red-50'
                )}
              >
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1">{isRTL && bc.message_ar ? bc.message_ar : bc.message}</p>
                  {bc.is_urgent && (
                    <Badge className="shrink-0 bg-red-100 text-red-700 text-xs">{t('urgentBroadcast')}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {getSenderName(bc.sender)} · {new Date(bc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
