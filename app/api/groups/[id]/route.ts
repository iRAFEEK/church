import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateGroupSchema } from '@/lib/schemas/group'

export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params?.id
  if (!id) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      ministry:ministry_id(id,name,name_ar),
      leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,email),
      co_leader:co_leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url),
      group_members(
        id, role_in_group, joined_at, is_active,
        profile:profile_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,status)
      )
    `)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    console.error('[/api/groups/[id] GET]', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ data })
}

export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params?.id
  if (!id) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const validated = validate(UpdateGroupSchema, body)

  const { data, error } = await supabase
    .from('groups')
    .update(validated)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error) {
    console.error('[/api/groups/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${data.church_id}`)
  revalidateTag(`groups-${data.church_id}`)
  return NextResponse.json({ data })
}

export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params?.id
  if (!id) return Response.json({ error: 'Not found' }, { status: 404 })

  // Soft delete
  const { data, error } = await supabase.from('groups').update({ is_active: false }).eq('id', id).select('church_id').single()
  if (error) {
    console.error('[/api/groups/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (data) revalidateTag(`dashboard-${data.church_id}`)
  return NextResponse.json({ success: true })
}
