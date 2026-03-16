import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { logger } from '@/lib/logger'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  scheduled_at: z.string().min(1),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  action_items: z.array(z.object({
    title: z.string().min(1).max(200),
    assigned_to: z.string().uuid().optional(),
    due_date: z.string().optional(),
  })).optional(),
})

const updateMeetingSchema = z.object({
  meeting_id: z.string().uuid(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().max(2000).optional(),
})

const toggleActionItemSchema = z.object({
  action_item_id: z.string().uuid(),
  status: z.enum(['open', 'done']),
})

// GET /api/ministries/[id]/meetings — list meetings
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const ministry_id = params?.id
  if (!ministry_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify ministry belongs to this church
  const { data: ministry } = await supabase
    .from('ministries')
    .select('id')
    .eq('id', ministry_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!ministry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('ministry_meetings')
    .select(`
      id, title, scheduled_at, location, notes, status, created_at,
      ministry_action_items(
        id, title, status, due_date,
        assigned:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
      )
    `)
    .eq('ministry_id', ministry_id)
    .eq('church_id', profile.church_id)
    .order('scheduled_at', { ascending: false })
    .limit(20)

  if (error) {
    logger.error('[/api/ministries/[id]/meetings GET]', { module: 'ministries', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ data })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// POST /api/ministries/[id]/meetings — create meeting with optional action items
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params?.id
  if (!ministry_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify ministry belongs to this church before creating meeting
  const { data: ministry } = await supabase
    .from('ministries')
    .select('id')
    .eq('id', ministry_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!ministry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = validate(createMeetingSchema, await req.json())

  const { data: meeting, error } = await supabase
    .from('ministry_meetings')
    .insert({
      ministry_id,
      church_id: profile.church_id,
      title: body.title,
      scheduled_at: body.scheduled_at,
      location: body.location || null,
      notes: body.notes || null,
      created_by: profile.id,
    })
    .select('id, title, scheduled_at, location, notes, status, created_at')
    .single()

  if (error) {
    logger.error('[/api/ministries/[id]/meetings POST]', { module: 'ministries', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Insert action items if provided
  if (body.action_items?.length) {
    const items = body.action_items.map(item => ({
      meeting_id: meeting.id,
      ministry_id,
      church_id: profile.church_id,
      title: item.title,
      assigned_to: item.assigned_to || null,
      due_date: item.due_date || null,
    }))

    const { error: itemsError } = await supabase
      .from('ministry_action_items')
      .insert(items)

    if (itemsError) {
      logger.error('[/api/ministries/[id]/meetings POST] action items', { module: 'ministries', error: itemsError })
    }
  }

  revalidateTag(`ministry-meetings-${profile.church_id}`)
  return NextResponse.json({ data: meeting }, { status: 201 })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// PATCH /api/ministries/[id]/meetings — update meeting status or toggle action item
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params?.id
  if (!ministry_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const raw = await req.json()

  // Toggle action item
  if (raw.action_item_id) {
    const body = validate(toggleActionItemSchema, raw)
    const { data, error } = await supabase
      .from('ministry_action_items')
      .update({ status: body.status })
      .eq('id', body.action_item_id)
      .eq('ministry_id', ministry_id)
      .eq('church_id', profile.church_id)
      .select('id, status')
      .single()

    if (error) {
      logger.error('[/api/ministries/[id]/meetings PATCH] action item', { module: 'ministries', error })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    revalidateTag(`ministry-meetings-${profile.church_id}`)
    return NextResponse.json({ data })
  }

  // Update meeting
  const body = validate(updateMeetingSchema, raw)
  const update: Record<string, string> = {}
  if (body.status) update.status = body.status
  if (body.notes !== undefined) update.notes = body.notes
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('ministry_meetings')
    .update(update)
    .eq('id', body.meeting_id)
    .eq('ministry_id', ministry_id)
    .eq('church_id', profile.church_id)
    .select('id, title, scheduled_at, status, notes')
    .single()

  if (error) {
    logger.error('[/api/ministries/[id]/meetings PATCH]', { module: 'ministries', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  revalidateTag(`ministry-meetings-${profile.church_id}`)
  return NextResponse.json({ data })
}, { requireRoles: ['ministry_leader', 'super_admin'] })
