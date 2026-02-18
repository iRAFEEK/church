import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const milestoneSchema = z.object({
  type: z.enum(['baptism', 'salvation', 'bible_plan_completed', 'leadership_training', 'marriage', 'other']).default('other'),
  title: z.string().min(1, 'Title is required'),
  title_ar: z.string().optional(),
  date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET /api/profiles/[id]/milestones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profile_milestones')
    .select('*')
    .eq('profile_id', id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/profiles/[id]/milestones
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const isSelf = id === user.id
  const isLeader = ['group_leader', 'ministry_leader', 'super_admin'].includes(currentProfile.role)

  if (!isSelf && !isLeader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = milestoneSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profile_milestones')
    .insert({
      profile_id: id,
      church_id: currentProfile.church_id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
