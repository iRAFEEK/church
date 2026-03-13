import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdatePrayerRequestSchema } from '@/lib/schemas/prayer'

// PATCH /api/prayer/[id] — update prayer request
// Requires: group_leader+ or the submitter or the assigned_to
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const body = validate(UpdatePrayerRequestSchema, await req.json())

  // First verify the prayer request exists and belongs to this church
  const { data: prayer, error: fetchError } = await supabase
    .from('prayer_requests')
    .select('id, submitted_by, assigned_to, church_id')
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .single()

  if (fetchError || !prayer) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Permission check: must be submitter, assigned_to, or leader+
  const isOwner = prayer.submitted_by === profile.id
  const isAssigned = prayer.assigned_to === profile.id
  const isLeader = ['super_admin', 'ministry_leader', 'group_leader'].includes(profile.role)

  if (!isOwner && !isAssigned && !isLeader) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('prayer_requests')
    .update(body)
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .select('id, content, is_private, status, assigned_to, submitted_by, created_at')
    .single()

  if (error) throw error
  return Response.json({ data })
})
