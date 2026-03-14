import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { EventRegistrationSchema } from '@/lib/schemas/event'

// POST /api/events/[id]/register — register for an event
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const eventId = params!.id

  // Check event exists, belongs to church, and is open for registration
  const { data: event } = await supabase
    .from('events')
    .select('id, status, capacity, registration_closes_at')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (!event) return Response.json({ error: 'Not found' }, { status: 404 })
  if (event.status === 'cancelled') {
    return Response.json({ error: 'Event is cancelled' }, { status: 400 })
  }
  if (event.registration_closes_at && new Date(event.registration_closes_at) < new Date()) {
    return Response.json({ error: 'Registration closed' }, { status: 400 })
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('event_id', eventId)
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)
    .single()

  if (existing) {
    return Response.json({ error: 'Already registered' }, { status: 409 })
  }

  // Check capacity
  if (event.capacity) {
    const { count } = await supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .neq('status', 'cancelled')

    if (count && count >= event.capacity) {
      return Response.json({ error: 'Event is full' }, { status: 400 })
    }
  }

  const body = validate(EventRegistrationSchema, await req.json().catch(() => ({})))

  // Fetch profile details for name/phone/email defaults
  const { data: profileData } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone, email')
    .eq('id', user.id)
    .eq('church_id', profile.church_id)
    .single()

  const { data, error } = await supabase
    .from('event_registrations')
    .insert({
      event_id: eventId,
      church_id: profile.church_id,
      profile_id: user.id,
      name: body.name || (profileData ? `${profileData.first_name} ${profileData.last_name}` : ''),
      phone: body.phone || profileData?.phone || null,
      email: body.email || profileData?.email || null,
      status: 'registered',
    })
    .select('id, event_id, profile_id, name, status, registered_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
})
