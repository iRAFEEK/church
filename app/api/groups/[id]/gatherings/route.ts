import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNextGatheringDate } from '@/lib/gatherings'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id: group_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  const { data, error } = await supabase
    .from('gatherings')
    .select('*, attendance(count)')
    .eq('group_id', group_id)
    .order('scheduled_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// Generate next gathering for a group
export async function POST(req: NextRequest, { params }: Params) {
  const { id: group_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // If manual override provided, use it; otherwise auto-calculate
  let scheduledAt = body.scheduled_at

  if (!scheduledAt) {
    const { data: group } = await supabase
      .from('groups')
      .select('meeting_day, meeting_time')
      .eq('id', group_id)
      .single()

    if (!group?.meeting_day) {
      return NextResponse.json({ error: 'Group has no meeting_day set' }, { status: 400 })
    }

    scheduledAt = getNextGatheringDate(group.meeting_day, group.meeting_time).toISOString()
  }

  const { data, error } = await supabase
    .from('gatherings')
    .insert({
      group_id,
      church_id: profile.church_id,
      scheduled_at: scheduledAt,
      location: body.location || null,
      topic: body.topic || null,
      notes: body.notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
