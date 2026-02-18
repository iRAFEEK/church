import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAndFlagAtRisk } from '@/lib/absence'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('gatherings')
    .select(`
      *,
      group:group_id(id, name, name_ar, leader_id, co_leader_id),
      attendance(id, profile_id, status, excuse_reason,
        profile:profile_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
      ),
      prayer_requests(id, content, is_private, status, submitted_by, created_at,
        submitter:submitted_by(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('gatherings')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If just completed, trigger at-risk check
  if (body.status === 'completed') {
    await checkAndFlagAtRisk(id)
  }

  return NextResponse.json({ data })
}
