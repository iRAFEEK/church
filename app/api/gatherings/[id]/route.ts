import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateGatheringSchema } from '@/lib/schemas/gathering'
import { checkAndFlagAtRisk } from '@/lib/absence'

export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params?.id
  if (!id) return Response.json({ error: 'Not found' }, { status: 404 })

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
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })
  return { data }
})

export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params?.id
  if (!id) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const validated = validate(UpdateGatheringSchema, body)

  const { data, error } = await supabase
    .from('gatherings')
    .update(validated)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  // If just completed, trigger at-risk check
  if (validated.status === 'completed') {
    await checkAndFlagAtRisk(id)
  }

  return { data }
})
