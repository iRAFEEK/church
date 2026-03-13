import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: ministry_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile_id, role_in_ministry } = await req.json()
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const role = role_in_ministry || 'member'

  // Upsert — re-activates if previously removed
  const { data, error } = await supabase
    .from('ministry_members')
    .upsert({
      ministry_id,
      profile_id,
      church_id: profile.church_id,
      role_in_ministry: role,
      is_active: true,
    }, { onConflict: 'ministry_id,profile_id' })
    .select()
    .single()

  if (error) {
    logger.error('Ministry member upsert failed', { module: 'ministries', churchId: profile.church_id, error })
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  // Auto role upgrade: if assigned as leader, upgrade profile role
  if (role === 'leader') {
    await autoUpgradeRole(supabase, profile_id)
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: ministry_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile_id, role_in_ministry } = await req.json()
  if (!profile_id || !role_in_ministry) {
    return NextResponse.json({ error: 'profile_id and role_in_ministry required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ministry_members')
    .update({ role_in_ministry })
    .eq('ministry_id', ministry_id)
    .eq('profile_id', profile_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto role upgrade if promoted to leader
  if (role_in_ministry === 'leader') {
    await autoUpgradeRole(supabase, profile_id)
  }

  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: ministry_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile_id } = await req.json()
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

  // Soft remove
  const { error } = await supabase
    .from('ministry_members')
    .update({ is_active: false })
    .eq('ministry_id', ministry_id)
    .eq('profile_id', profile_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoUpgradeRole(supabase: any, profileId: string) {
  const { data: memberProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single()

  if (memberProfile && ['member', 'group_leader'].includes(memberProfile.role)) {
    await supabase
      .from('profiles')
      .update({ role: 'ministry_leader' })
      .eq('id', profileId)
  }
}
