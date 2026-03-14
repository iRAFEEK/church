import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateMinistrySchema } from '@/lib/schemas/ministry'

// GET /api/ministries/[id] — get ministry detail with members
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const { data, error } = await supabase
    .from('ministries')
    .select(`
      id, name, name_ar, description, description_ar, is_active, photo_url, church_id, created_at,
      leader:leader_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url),
      groups(id, name, name_ar, type, is_active),
      ministry_members(id, role_in_ministry, joined_at, is_active,
        profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url, phone, status)
      )
    `)
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ data })
})

// PATCH /api/ministries/[id] — update ministry
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const body = validate(UpdateMinistrySchema, await req.json())

  const { data, error } = await supabase
    .from('ministries')
    .update(body)
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .select('id, name, name_ar, description, description_ar, is_active, photo_url, church_id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// DELETE /api/ministries/[id] — delete ministry (super_admin only)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const { error } = await supabase
    .from('ministries')
    .delete()
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ success: true })
}, { requireRoles: ['super_admin'] })
