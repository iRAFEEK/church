import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { calendarQuerySchema } from '@/lib/schemas/calendar'
import type { CalendarItem } from '@/types'

// GET /api/calendar — aggregated calendar items for a date range
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const { start, end } = validate(calendarQuerySchema, {
    start: searchParams.get('start'),
    end: searchParams.get('end'),
  })

  const churchId = profile.church_id

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

  const items: CalendarItem[] = []

  // Map events
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

  // Map serving slots
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

  // Map gatherings
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

  return Response.json({ items })
}, {
  requireRoles: ['ministry_leader', 'super_admin'],
  rateLimit: 'relaxed',
})
