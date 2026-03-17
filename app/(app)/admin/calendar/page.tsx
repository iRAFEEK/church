import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { CalendarDays } from 'lucide-react'

import { CalendarPageClient } from '@/components/calendar/CalendarPageClient'
import type { CalendarItem } from '@/types'

export default async function CalendarPage() {
  const user = await requirePermission('can_manage_events')
  const t = await getTranslations('calendar')
  const supabase = await createClient()
  const churchId = user.profile.church_id

  // Compute current month range
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // Fetch all three sources in parallel
  const [eventsResult, slotsResult, gatheringsResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, title_ar, event_type, starts_at, ends_at, location, status')
      .eq('church_id', churchId)
      .gte('starts_at', `${start}T00:00:00`)
      .lte('starts_at', `${end}T23:59:59`)
      .in('status', ['published', 'draft'])
      .order('starts_at')
      .limit(200),

    supabase
      .from('serving_slots')
      .select('id, title, title_ar, date, start_time, end_time, serving_areas(name, name_ar)')
      .eq('church_id', churchId)
      .gte('date', start)
      .lte('date', end)
      .order('date')
      .limit(200),

    supabase
      .from('gatherings')
      .select('id, group_id, scheduled_at, location, topic, topic_ar, status, groups(name, name_ar)')
      .eq('church_id', churchId)
      .gte('scheduled_at', `${start}T00:00:00`)
      .lte('scheduled_at', `${end}T23:59:59`)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at')
      .limit(200),
  ])

  // Map to unified CalendarItem format
  const items: CalendarItem[] = []

  if (eventsResult.data) {
    for (const e of eventsResult.data) {
      items.push({
        id: e.id,
        type: 'event',
        title: e.title,
        title_ar: e.title_ar,
        date: e.starts_at.slice(0, 10),
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        location: e.location,
        event_type: e.event_type,
        event_status: e.status,
      })
    }
  }

  if (slotsResult.data) {
    for (const s of slotsResult.data) {
      const area = s.serving_areas as unknown as { name: string; name_ar: string | null } | null
      items.push({
        id: s.id,
        type: 'serving',
        title: s.title,
        title_ar: s.title_ar,
        date: s.date,
        starts_at: s.start_time,
        ends_at: s.end_time,
        location: null,
        area_name: area?.name,
        area_name_ar: area?.name_ar,
      })
    }
  }

  if (gatheringsResult.data) {
    for (const g of gatheringsResult.data) {
      const group = g.groups as unknown as { name: string; name_ar: string | null } | null
      items.push({
        id: g.id,
        type: 'gathering',
        title: group?.name ?? '',
        title_ar: group?.name_ar ?? null,
        date: g.scheduled_at.slice(0, 10),
        starts_at: g.scheduled_at,
        ends_at: null,
        location: g.location,
        group_name: group?.name,
        group_name_ar: group?.name_ar,
        group_id: g.group_id,
        gathering_status: g.status,
        topic: g.topic,
        topic_ar: g.topic_ar,
      })
    }
  }

  return (
    <div className="px-4 md:px-6 pt-4 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t('pageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>
      <CalendarPageClient initialItems={items} initialMonth={start} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
