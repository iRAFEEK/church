import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events/[id]/ministry-summary — service needs grouped by ministry/group
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: needs, error } = await supabase
    .from('event_service_needs')
    .select(`
      *,
      ministry:ministry_id(id, name, name_ar, leader_id),
      group:group_id(id, name, name_ar, leader_id, co_leader_id),
      event_service_assignments(
        id, profile_id, status, assigned_by, notes, role, role_ar, created_at,
        profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone)
      )
    `)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)

  if (error) {
    console.error('[/api/events/[id]/ministry-summary GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Group by ministry/group
  const grouped: Record<string, any> = {}

  for (const need of needs || []) {
    const key = need.ministry_id
      ? `ministry:${need.ministry_id}`
      : `group:${need.group_id}`

    if (!grouped[key]) {
      grouped[key] = {
        type: need.ministry_id ? 'ministry' : 'group',
        ministry: need.ministry || null,
        group: need.group || null,
        needs: [],
        assignments: [],
        stats: { total_needed: 0, assigned: 0, confirmed: 0, declined: 0, pending: 0 },
      }
    }

    const assignments = need.event_service_assignments || []
    grouped[key].needs.push({
      id: need.id,
      volunteers_needed: need.volunteers_needed,
      notes: need.notes,
      notes_ar: need.notes_ar,
    })

    grouped[key].stats.total_needed += need.volunteers_needed

    for (const a of assignments) {
      grouped[key].assignments.push(a)
      if (a.status === 'confirmed') grouped[key].stats.confirmed++
      else if (a.status === 'declined') grouped[key].stats.declined++
      else grouped[key].stats.pending++
      if (a.status !== 'declined') grouped[key].stats.assigned++
    }
  }

  return NextResponse.json({ data: Object.values(grouped) })
}
