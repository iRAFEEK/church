import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  occupation: z.string().optional().nullable(),
  occupation_ar: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  role: z.enum(['member', 'group_leader', 'ministry_leader', 'super_admin']).optional(),
  status: z.enum(['active', 'inactive', 'at_risk', 'visitor']).optional(),
  notification_pref: z.enum(['whatsapp', 'sms', 'email', 'all', 'none']).optional(),
  preferred_language: z.string().optional(),
  onboarding_completed: z.boolean().optional(),
})

// GET /api/profiles/[id]
export async function GET(
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

  if (!currentProfile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Users can read own profile; admins can read any in church
  const isSelf = id === user.id
  const isAdmin = ['ministry_leader', 'super_admin'].includes(currentProfile.role)

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('church_id', currentProfile.church_id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

// PATCH /api/profiles/[id]
export async function PATCH(
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

  if (!currentProfile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isSelf = id === user.id
  const isAdmin = ['ministry_leader', 'super_admin'].includes(currentProfile.role)

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Non-admins cannot change role
  if (!isAdmin && parsed.data.role) {
    delete parsed.data.role
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', id)
    .eq('church_id', currentProfile.church_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
