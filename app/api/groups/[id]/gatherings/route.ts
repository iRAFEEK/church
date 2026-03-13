import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { getNextGatheringDate } from '@/lib/gatherings'

export const GET = apiHandler(async ({ req, supabase, profile, params }) => {
  const group_id = params?.id
  if (!group_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  const { data, error } = await supabase
    .from('gatherings')
    .select('id, group_id, church_id, scheduled_at, status, location, topic, notes, created_by, created_at, attendance(count)')
    .eq('group_id', group_id)
    .eq('church_id', profile.church_id)
    .order('scheduled_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[/api/groups/[id]/gatherings GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
})

// Generate next gathering for a group
export const POST = apiHandler(async ({ req, supabase, profile, user, params }) => {
  const group_id = params?.id
  if (!group_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // If manual override provided, use it; otherwise auto-calculate
  let scheduledAt = body.scheduled_at

  if (!scheduledAt) {
    const { data: group } = await supabase
      .from('groups')
      .select('meeting_day, meeting_time')
      .eq('id', group_id)
      .eq('church_id', profile.church_id)
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

  if (error) {
    console.error('[/api/groups/[id]/gatherings POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
})
