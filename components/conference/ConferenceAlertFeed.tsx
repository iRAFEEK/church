'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  blockedTasks: Array<{
    id: string
    title: string
    team: { name: string; name_ar: string | null } | null
  }>
  locale: string
}

export function ConferenceAlertFeed({ blockedTasks, locale }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const getTeamName = (team: Props['blockedTasks'][0]['team']) => {
    if (!team) return ''
    return isRTL ? (team.name_ar || team.name) : team.name
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {t('alertsLabel')}
          {blockedTasks.length > 0 && (
            <Badge className="bg-red-100 text-red-700 text-xs ms-1">{blockedTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {blockedTasks.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('noAlerts')}</span>
          </div>
        )}
        {blockedTasks.map((task) => (
          <div key={task.id} className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-800">{task.title}</p>
                {task.team && (
                  <p className="text-xs text-red-600 mt-0.5">{getTeamName(task.team)}</p>
                )}
              </div>
            </div>
            <Badge className="bg-red-100 text-red-700 text-xs">{t('taskBlocked')}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
