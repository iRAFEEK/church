import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateGatheringPrayerSchema } from '@/lib/schemas/gathering'

export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const gathering_id = params?.id
  if (!gathering_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify gathering belongs to this church
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('id, church_id')
    .eq('id', gathering_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!gathering) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('prayer_requests')
    .select('id, content, is_private, status, submitted_by, created_at, submitter:submitted_by(id,first_name,last_name,first_name_ar,last_name_ar,photo_url)')
    .eq('gathering_id', gathering_id)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[/api/gatherings/[id]/prayer GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
})

export const POST = apiHandler(async ({ req, supabase, profile, user, params }) => {
  const gathering_id = params?.id
  if (!gathering_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { content, is_private } = validate(CreateGatheringPrayerSchema, await req.json())

  // Get gathering's group + church — verify church_id
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('group_id, church_id')
    .eq('id', gathering_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!gathering) return NextResponse.json({ error: 'Gathering not found' }, { status: 404 })

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

  if (error) {
    console.error('[/api/gatherings/[id]/prayer POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
})
