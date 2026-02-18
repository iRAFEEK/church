import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: gathering_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('prayer_requests')
    .select('*, submitter:submitted_by(id,first_name,last_name,first_name_ar,last_name_ar,photo_url)')
    .eq('gathering_id', gathering_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: gathering_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, is_private } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  // Get gathering's group + church
  const { data: gathering } = await supabase
    .from('gatherings')
    .select('group_id, church_id')
    .eq('id', gathering_id)
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
    .select('*, submitter:submitted_by(id,first_name,last_name,first_name_ar,last_name_ar,photo_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
