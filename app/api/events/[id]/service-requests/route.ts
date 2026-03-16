import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateServiceRequestSchema } from '@/lib/schemas/service-request'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

// GET /api/events/[id]/service-requests — list service requests for an event
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const eventId = params!.id

  // Verify event belongs to this church
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (eventError || !event) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('event_service_requests')
    .select(`
      id, event_id, requested_role, status, notes, response_note, created_at, updated_at,
      requested_by_profile:requested_by(id, first_name, last_name, first_name_ar, last_name_ar, photo_url),
      assigned_to_profile:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
    `)
    .eq('event_id', eventId)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return { data: data ?? [] }
})

// POST /api/events/[id]/service-requests — create a service request
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const eventId = params!.id
  const body = validate(CreateServiceRequestSchema, await req.json())

  // Verify event belongs to this church
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, title_ar, starts_at')
    .eq('id', eventId)
    .eq('church_id', profile.church_id)
    .single()

  if (eventError || !event) return Response.json({ error: 'Not found' }, { status: 404 })

  // Verify assigned_to is a member of the same church
  const { data: assignee, error: assigneeError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('id', body.assigned_to)
    .eq('church_id', profile.church_id)
    .eq('status', 'active')
    .single()

  if (assigneeError || !assignee) return Response.json({ error: 'Assignee not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('event_service_requests')
    .insert({
      event_id: eventId,
      church_id: profile.church_id,
      requested_role: body.requested_role,
      requested_by: profile.id,
      assigned_to: body.assigned_to,
      notes: body.notes || null,
    })
    .select('id, event_id, requested_role, status, notes, created_at')
    .single()

  if (error) throw error

  // Get requester name for notification
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', profile.id)
    .single()

  // Notify the assigned person (fire-and-forget)
  const requesterName = requesterProfile
    ? `${requesterProfile.first_name ?? ''} ${requesterProfile.last_name ?? ''}`.trim() || 'Someone'
    : 'Someone'
  const eventDate = new Date(event.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  sendNotification({
    profileId: body.assigned_to,
    churchId: profile.church_id,
    type: 'event_service_request',
    titleEn: 'Service Request',
    titleAr: 'طلب خدمة',
    bodyEn: `${requesterName} has requested you to serve as "${body.requested_role}" for "${event.title}" on ${eventDate}.`,
    bodyAr: `${requesterName} طلب منك الخدمة كـ "${body.requested_role}" في "${event.title_ar || event.title}" يوم ${eventDate}.`,
    referenceId: data.id,
    referenceType: 'service_request',
  }).catch((err) =>
    logger.error('Service request notification failed', { module: 'events', churchId: profile.church_id, error: err })
  )

  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_events'] })
