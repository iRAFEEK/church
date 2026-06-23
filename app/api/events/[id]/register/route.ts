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

  // Check capacity (keep this — upsert handles duplicate prevention via DB constraint)
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

  // DB-3 fix: upsert with unique constraint on (event_id, profile_id) prevents duplicates
  // from concurrent requests or network retries without TOCTOU race
  const regName = body.name || (profileData ? `${profileData.first_name} ${profileData.last_name}` : '')
  const regPhone = body.phone || profileData?.phone || null
  const regEmail = body.email || profileData?.email || null
  const cols = 'id, event_id, profile_id, name, status, registered_at'

  // The uniqueness guard is a PARTIAL index (mig 049: WHERE profile_id IS NOT NULL),
  // which a column-list .upsert(onConflict) cannot match. Insert, then on a unique
  // violation update the existing registration (re-registering reactivates it).
  const { data, error } = await supabase
    .from('event_registrations')
    .insert({
      event_id: eventId,
      church_id: profile.church_id,
      profile_id: user.id,
      name: regName,
      phone: regPhone,
      email: regEmail,
      status: 'registered',
    })
    .select(cols)
    .single()

  if (error) {
    if (error.code === '23505') {
      // Already registered — idempotent. (RLS lets members read but not update
      // their own registration, so we return the existing row rather than merge.)
      const { data: existing } = await supabase
        .from('event_registrations')
        .select(cols)
        .eq('event_id', eventId)
        .eq('profile_id', user.id)
        .single()
      return Response.json({ data: existing }, { status: 200 })
    }
    throw error
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
})
