import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { revalidateTag } from 'next/cache'
import { notifyMeetingActionAssigned } from '@/lib/messaging/triggers'
import { z } from 'zod'

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
  meeting_id: z.string().uuid().optional(),
})

const updateItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'done']).optional(),
  title: z.string().min(1).max(200).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

const deleteItemSchema = z.object({
  id: z.string().uuid(),
})

// GET /api/ministries/[id]/action-items — all action items for this ministry
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const ministry_id = params?.id
  if (!ministry_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: ministry } = await supabase
    .from('ministries')
    .select('id')
    .eq('id', ministry_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!ministry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('ministry_action_items')
    .select(`
      id, title, status, due_date, meeting_id, created_at,
      assigned:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar, photo_url),
      meeting:meeting_id(id, title)
    `)
    .eq('ministry_id', ministry_id)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return { data }
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// POST /api/ministries/[id]/action-items — create a standalone or meeting-linked action item
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params?.id
  if (!ministry_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: ministry } = await supabase
    .from('ministries')
    .select('id, name, name_ar')
    .eq('id', ministry_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!ministry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = validate(createItemSchema, await req.json())

  const { data, error } = await supabase
    .from('ministry_action_items')
    .insert({
      ministry_id,
      church_id: profile.church_id,
      meeting_id: body.meeting_id || null,
      title: body.title,
      assigned_to: body.assigned_to || null,
      due_date: body.due_date || null,
    })
    .select(`
      id, title, status, due_date, meeting_id, created_at,
      assigned:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
    `)
    .single()

  if (error) throw error

  // Notify assigned member
  if (body.assigned_to) {
    const ministryName = ministry.name_ar || ministry.name
    notifyMeetingActionAssigned(
      profile.church_id,
      'Task',
      ministryName,
      [{ title: body.title, assigned_to: body.assigned_to, due_date: body.due_date }]
    ).catch(() => {})
  }

  revalidateTag(`ministry-action-items-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// PATCH /api/ministries/[id]/action-items — update an action item
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params?.id
  if (!ministry_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = validate(updateItemSchema, await req.json())

  const update: Record<string, string | null> = {}
  if (body.status !== undefined) update.status = body.status
  if (body.title !== undefined) update.title = body.title
  if (body.assigned_to !== undefined) update.assigned_to = body.assigned_to
  if (body.due_date !== undefined) update.due_date = body.due_date

  const { data, error } = await supabase
    .from('ministry_action_items')
    .update(update)
    .eq('id', body.id)
    .eq('ministry_id', ministry_id)
    .eq('church_id', profile.church_id)
    .select(`
      id, title, status, due_date, meeting_id, created_at,
      assigned:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)
    `)
    .single()

  if (error) throw error

  revalidateTag(`ministry-action-items-${profile.church_id}`)
  return { data }
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// DELETE /api/ministries/[id]/action-items — delete an action item
export const DELETE = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params?.id
  if (!ministry_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = validate(deleteItemSchema, await req.json())

  const { error } = await supabase
    .from('ministry_action_items')
    .delete()
    .eq('id', body.id)
    .eq('ministry_id', ministry_id)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`ministry-action-items-${profile.church_id}`)
  return { success: true }
}, { requireRoles: ['ministry_leader', 'super_admin'] })
