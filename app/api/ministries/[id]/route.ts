import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try with ministry_members, fall back without if table doesn't exist yet
  let data, error
  const result = await supabase
    .from('ministries')
    .select('*, leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url), groups(id,name,name_ar,type,is_active), ministry_members(id,role_in_ministry,joined_at,is_active,profile:profile_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone,status))')
    .eq('id', id)
    .single()

  if (result.error?.message?.includes('ministry_members')) {
    const fallback = await supabase
      .from('ministries')
      .select('*, leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url), groups(id,name,name_ar,type,is_active)')
      .eq('id', id)
      .single()
    data = fallback.data ? { ...fallback.data, ministry_members: [] } : null
    error = fallback.error
  } else {
    data = result.data
    error = result.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
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
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('ministries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
