import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ data })
})

  if (error) {
    console.error('[/api/ministries/[id] GET]', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Only pass known columns to avoid errors if migration not applied
  const allowed = ['name', 'name_ar', 'description', 'description_ar', 'leader_id', 'is_active', 'photo_url']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('ministries')
    .update(updates)
    .eq('id', id)
    .select('*, church_id')
    .single()

  if (error) {
    console.error('[/api/ministries/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

// DELETE /api/ministries/[id] — delete ministry (super_admin only)
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const { error } = await supabase
    .from('ministries')
    .delete()
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)

  // Get church_id before deleting for cache invalidation
  const { data: ministry } = await supabase.from('ministries').select('church_id').eq('id', id).single()

  const { error } = await supabase.from('ministries').delete().eq('id', id)
  if (error) {
    console.error('[/api/ministries/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
