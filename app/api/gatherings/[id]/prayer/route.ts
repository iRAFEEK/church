import { apiHandler } from '@/lib/api/handler'

export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const gathering_id = params?.id
  if (!gathering_id) return Response.json({ error: 'Not found' }, { status: 404 })

  // Verify gathering belongs to this church
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('id, church_id')
    .eq('id', gathering_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!gathering) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('prayer_requests')
    .select('id, content, is_private, status, submitted_by, created_at, submitter:submitted_by(id,first_name,last_name,first_name_ar,last_name_ar,photo_url)')
    .eq('gathering_id', gathering_id)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: true })

  if (error) throw error
  return { data }
})

export const POST = apiHandler(async ({ req, supabase, profile, user, params }) => {
  const gathering_id = params?.id
  if (!gathering_id) return Response.json({ error: 'Not found' }, { status: 404 })

  const { content, is_private } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'content required' }, { status: 400 })

  // Get gathering's group + church — verify church_id
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('group_id, church_id')
    .eq('id', gathering_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!gathering) return Response.json({ error: 'Gathering not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({
      gathering_id,
      group_id: gathering.group_id,
      church_id: gathering.church_id,
      submitted_by: user.id,
      content: content.trim(),
      is_private: !!is_private,
    })
    .select('id, content, is_private, status, submitted_by, created_at, submitter:submitted_by(id,first_name,last_name,first_name_ar,last_name_ar,photo_url)')
    .single()

  if (error) throw error
  return Response.json({ data }, { status: 201 })
})
