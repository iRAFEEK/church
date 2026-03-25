'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

interface Props {
  eventId: string
  churchId: string
  areaId: string
  areaName: string
  locale: string
}

export function CheckinProgressBar({ eventId, churchId, areaId, areaName, locale }: Props) {
  const t = useTranslations('conference')
  const [checked, setChecked] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function fetchStats() {
      // Get all team_ids for this area
      const { data: teams } = await supabase
        .from('conference_teams')
        .select('id')
        .eq('area_id', areaId)
        .eq('event_id', eventId)
        .limit(200)

      if (!teams || teams.length === 0) return

      const teamIds = teams.map((t) => t.id)
      const { data: members } = await supabase
        .from('conference_team_members')
        .select('checkin_status')
        .in('team_id', teamIds)
        .eq('event_id', eventId)
        .eq('church_id', churchId)
        .limit(5000)

      const all = members || []
      setTotal(all.length)
      setChecked(all.filter((m) => m.checkin_status === 'checked_in').length)
    }

    fetchStats()
  }, [eventId, churchId, areaId])

  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{areaName}</span>
        <span className="text-muted-foreground" dir="ltr">{checked}/{total}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t('progressLabel').replace('{checked}', String(checked)).replace('{total}', String(total))}
      </p>
    </div>
  )
}
