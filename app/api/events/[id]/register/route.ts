import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/events/[id]/register — register for an event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, first_name, last_name, phone, email')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Check event exists and is open for registration
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status === 'cancelled') {
    return NextResponse.json({ error: 'Event is cancelled' }, { status: 400 })
  }
  if (event.registration_closes_at && new Date(event.registration_closes_at) < new Date()) {
    return NextResponse.json({ error: 'Registration closed' }, { status: 400 })
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('profile_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  }

  // Check capacity
  if (event.capacity) {
    const { count } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .neq('status', 'cancelled')

    if (count && count >= event.capacity) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }
  }

  const body = await req.json().catch(() => ({}))

  const { data, error } = await supabase
    .from('event_registrations')
    .insert({
      event_id: eventId,
      church_id: profile.church_id,
      profile_id: user.id,
      name: body.name || `${profile.first_name} ${profile.last_name}`,
      phone: body.phone || profile.phone,
      email: body.email || profile.email,
      status: 'registered',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
