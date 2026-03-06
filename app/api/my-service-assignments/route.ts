import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/my-service-assignments — current user's upcoming service assignments
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: assignments, error } = await supabase
    .from('event_service_assignments')
    .select(`
      id,
      service_need_id,
      status,
      notes,
      created_at,
      service_need:service_need_id(
        id,
        volunteers_needed,
        ministry:ministry_id(name, name_ar),
        group:group_id(name, name_ar),
        event:event_id(id, title, title_ar, starts_at, ends_at, location, status)
      )
    `)
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten and filter to upcoming events
  const now = new Date().toISOString()
  const enriched = (assignments || [])
    .map((a: any) => {
      const need = a.service_need
      if (!need?.event) return null
      return {
        id: a.id,
        service_need_id: a.service_need_id,
        status: a.status,
        event: need.event,
        ministry: need.ministry,
        group: need.group,
        volunteers_needed: need.volunteers_needed,
      }
    })
    .filter((a: any) => a && a.event.starts_at >= now && a.event.status !== 'cancelled')
    .sort((a: any, b: any) => a.event.starts_at.localeCompare(b.event.starts_at))

  return NextResponse.json({ data: enriched })
}
