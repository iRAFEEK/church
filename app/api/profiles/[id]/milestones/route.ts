import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { z } from 'zod'

const milestoneSchema = z.object({
  type: z.enum(['baptism', 'salvation', 'bible_plan_completed', 'leadership_training', 'marriage', 'other']).default('other'),
  title: z.string().min(1, 'Title is required'),
  title_ar: z.string().optional(),
  date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET /api/profiles/[id]/milestones
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('profile_milestones')
    .select('id, type, title, title_ar, date, notes, created_at')
    .eq('profile_id', id)
    .eq('church_id', profile.church_id)
    .order('date', { ascending: false })

  if (error) throw error

  return data
})

// POST /api/profiles/[id]/milestones
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const id = params!.id

  const isSelf = id === user.id
  const isLeader = ['group_leader', 'ministry_leader', 'super_admin'].includes(profile.role)

  if (!isSelf && !isLeader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = validate(milestoneSchema, body)

  const { data, error } = await supabase
    .from('profile_milestones')
    .insert({
      profile_id: id,
      church_id: profile.church_id,
      ...parsed,
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(data, { status: 201 })
})
