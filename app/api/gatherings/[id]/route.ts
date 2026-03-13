import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateGatheringSchema } from '@/lib/schemas/gathering'
import { checkAndFlagAtRisk } from '@/lib/absence'

// GET /api/gatherings/[id] — get gathering detail with attendance + prayer
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const { data, error } = await supabase
    .from('gatherings')
    .select(`
      id, group_id, church_id, scheduled_at, location, location_ar,
      topic, topic_ar, notes, status, created_at,
      group:group_id(id, name, name_ar, leader_id, co_leader_id),
      attendance(id, profile_id, status, excuse_reason,
        profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
      ),
      prayer_requests(id, content, is_private, status, submitted_by, created_at,
        submitter:submitted_by(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
      )
    `)
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Filter out private prayer requests unless user is the submitter or a leader
  if (data.prayer_requests) {
    const isLeader = ['super_admin', 'ministry_leader', 'group_leader'].includes(profile.role)
    data.prayer_requests = data.prayer_requests.filter(
      (p: { is_private: boolean; submitted_by: string }) =>
        !p.is_private || p.submitted_by === profile.id || isLeader
    )
  }

  return Response.json({ data })
})

// PATCH /api/gatherings/[id] — update gathering (leaders+)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const body = validate(UpdateGatheringSchema, await req.json())

  const { data, error } = await supabase
    .from('gatherings')
    .update(body)
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .select('id, group_id, scheduled_at, location, location_ar, topic, topic_ar, notes, status')
    .single()

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // If just completed, trigger at-risk check
  if (body.status === 'completed') {
    await checkAndFlagAtRisk(params!.id)
  }

  return Response.json({ data })
}, { requireRoles: ['super_admin', 'ministry_leader', 'group_leader'] })
