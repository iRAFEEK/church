import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateServiceRequestSchema } from '@/lib/schemas/service-request'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

// PATCH /api/events/[id]/service-requests/[requestId] — respond to a service request
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const requestId = params!.requestId
  const body = validate(UpdateServiceRequestSchema, await req.json())

  // Fetch the request with church_id check
  const { data: request, error: fetchError } = await supabase
    .from('event_service_requests')
    .select('id, event_id, requested_role, requested_by, assigned_to, status')
    .eq('id', requestId)
    .eq('church_id', profile.church_id)
    .single()

  if (fetchError || !request) return Response.json({ error: 'Not found' }, { status: 404 })

  // Only the assigned person or an admin can respond
  const isAssignee = request.assigned_to === profile.id
  const isAdmin = profile.role === 'super_admin' || profile.role === 'ministry_leader'

  if (!isAssignee && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Cannot respond to already-responded requests
  if (request.status !== 'pending') {
    return Response.json({ error: 'Request already responded to' }, { status: 409 })
  }

  // Handle reassignment
  const updateData: Record<string, string | null> = {
    status: body.status,
    response_note: body.response_note || null,
    updated_at: new Date().toISOString(),
  }

  if (body.status === 'reassigned' && body.reassign_to) {
    // Verify new assignee is in the same church
    const { data: newAssignee, error: newAssigneeError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', body.reassign_to)
      .eq('church_id', profile.church_id)
      .eq('status', 'active')
      .single()

    if (newAssigneeError || !newAssignee) {
      return Response.json({ error: 'New assignee not found' }, { status: 404 })
    }

    // Create a new pending request for the reassigned person
    const { error: newReqError } = await supabase
      .from('event_service_requests')
      .insert({
        event_id: request.event_id,
        church_id: profile.church_id,
        requested_role: request.requested_role,
        requested_by: request.requested_by,
        assigned_to: body.reassign_to,
        notes: body.response_note || null,
      })

    if (newReqError) throw newReqError

    // Notify the new assignee
    const { data: event } = await supabase
      .from('events')
      .select('title, title_ar, starts_at')
      .eq('id', request.event_id)
      .eq('church_id', profile.church_id)
      .single()

    if (event) {
      const eventDate = new Date(event.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      sendNotification({
        profileId: body.reassign_to,
        churchId: profile.church_id,
        type: 'event_service_request',
        titleEn: 'Service Request',
        titleAr: 'طلب خدمة',
        bodyEn: `You have been requested to serve as "${request.requested_role}" for "${event.title}" on ${eventDate}.`,
        bodyAr: `تم طلبك للخدمة كـ "${request.requested_role}" في "${event.title_ar || event.title}" يوم ${eventDate}.`,
        referenceId: requestId,
        referenceType: 'service_request',
      }).catch((err) =>
        logger.error('Service request reassign notification failed', { module: 'events', churchId: profile.church_id, error: err })
      )
    }
  }

  // Update the original request
  const { data, error } = await supabase
    .from('event_service_requests')
    .update(updateData)
    .eq('id', requestId)
    .eq('church_id', profile.church_id)
    .select('id, event_id, requested_role, status, response_note, updated_at')
    .single()

  if (error) throw error

  // Notify the requester about the response
  const statusLabels: Record<string, { en: string; ar: string }> = {
    accepted: { en: 'accepted', ar: 'قبل' },
    declined: { en: 'declined', ar: 'رفض' },
    reassigned: { en: 'reassigned to someone else', ar: 'أحال لشخص آخر' },
  }

  const { data: responder } = await supabase
    .from('profiles')
    .select('first_name, last_name, first_name_ar, last_name_ar')
    .eq('id', profile.id)
    .single()

  const responderName = responder
    ? `${responder.first_name ?? ''} ${responder.last_name ?? ''}`.trim()
    : 'Someone'
  const responderNameAr = responder
    ? `${responder.first_name_ar ?? responder.first_name ?? ''} ${responder.last_name_ar ?? responder.last_name ?? ''}`.trim()
    : 'شخص'

  const label = statusLabels[body.status] ?? { en: body.status, ar: body.status }

  sendNotification({
    profileId: request.requested_by,
    churchId: profile.church_id,
    type: 'event_service_response',
    titleEn: 'Service Request Response',
    titleAr: 'رد على طلب خدمة',
    bodyEn: `${responderName} has ${label.en} your request for "${request.requested_role}".`,
    bodyAr: `${responderNameAr} ${label.ar} طلبك لخدمة "${request.requested_role}".`,
    referenceId: requestId,
    referenceType: 'service_request',
  }).catch((err) =>
    logger.error('Service request response notification failed', { module: 'events', churchId: profile.church_id, error: err })
  )

  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
})
