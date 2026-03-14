import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateRegistrationSchema } from '@/lib/schemas/event'

// GET /api/events/[id]/registrations — list registrations
export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('event_registrations')
    .select('id, event_id, profile_id, name, phone, email, status, check_in_at, registered_at', { count: 'exact' })
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('registered_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) throw error

  return { data, count }
}, { requirePermissions: ['can_manage_events'] })

// PATCH /api/events/[id]/registrations — check-in or cancel a registration
export const PATCH = apiHandler(async ({ supabase, profile, params, req }) => {
  const eventId = params!.id
  const body = validate(UpdateRegistrationSchema, await req.json())
  const { registrationId, action } = body

  const updates: Record<string, string> = {}
  if (action === 'check_in') {
    updates.status = 'checked_in'
    updates.check_in_at = new Date().toISOString()
  } else if (action === 'cancel') {
    updates.status = 'cancelled'
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .update(updates)
    .eq('id', registrationId)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .select('id, event_id, profile_id, name, status, check_in_at')
    .single()

  if (error) throw error
  return { data }
}, { requirePermissions: ['can_manage_events'] })
