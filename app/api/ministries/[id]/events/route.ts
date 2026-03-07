import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: ministryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Get events linked to this ministry via event_service_needs
  const { data: needs } = await supabase
    .from('event_service_needs')
    .select(`
      event_id,
      volunteers_needed,
      event:event_id(id, title, title_ar, event_type, starts_at, ends_at, location, status)
    `)
    .eq('ministry_id', ministryId)
    .eq('church_id', profile.church_id)

  if (!needs) return NextResponse.json({ data: { upcoming: [], recent: [] } })

  // Deduplicate events and split into upcoming/recent
  const now = new Date().toISOString()
  const seen = new Set<string>()
  const upcoming: any[] = []
  const recent: any[] = []

  for (const need of needs) {
    const event = need.event as any
    if (!event || seen.has(event.id)) continue
    seen.add(event.id)

    if (event.starts_at >= now && event.status !== 'cancelled') {
      upcoming.push(event)
    } else {
      recent.push(event)
    }
  }

  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  recent.sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  return NextResponse.json({
    data: {
      upcoming: upcoming.slice(0, 10),
      recent: recent.slice(0, 10),
    }
  })
}
