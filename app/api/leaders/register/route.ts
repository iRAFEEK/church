import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can register leaders
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['ministry_leader', 'super_admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { email, first_name, last_name, first_name_ar, last_name_ar, phone } = body

  if (!email || !first_name || !last_name) {
    return NextResponse.json({ error: 'Email, first name, and last name are required' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  // Check if email already exists as a profile in this church
  const { data: existingProfile } = await adminSupabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, role')
    .eq('church_id', callerProfile.church_id)
    .eq('email', email)
    .single()

  if (existingProfile) {
    if (existingProfile.role === 'member') {
      // Promote existing member to group_leader
      await adminSupabase
        .from('profiles')
        .update({ role: 'group_leader', status: 'active' })
        .eq('id', existingProfile.id)

      return NextResponse.json({
        data: {
          id: existingProfile.id,
          first_name: existingProfile.first_name,
          last_name: existingProfile.last_name,
          first_name_ar: existingProfile.first_name_ar,
          last_name_ar: existingProfile.last_name_ar,
        },
        promoted: true,
      })
    }
    // Already a leader or admin
    return NextResponse.json({
      data: {
        id: existingProfile.id,
        first_name: existingProfile.first_name,
        last_name: existingProfile.last_name,
        first_name_ar: existingProfile.first_name_ar,
        last_name_ar: existingProfile.last_name_ar,
      },
      existing: true,
    })
  }

  // Create new auth user
  const tempPassword = crypto.randomUUID()
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { church_id: callerProfile.church_id },
  })

  if (authError || !authData.user) {
    if (authError?.message?.includes('already been registered')) {
      return NextResponse.json(
        { error: 'Email already registered in another church' },
        { status: 409 }
      )
    }
    console.error('[/api/leaders/register POST]', authError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Update the auto-created profile with details and role
  const { data: profile, error: updateError } = await adminSupabase
    .from('profiles')
    .update({
      first_name,
      last_name,
      first_name_ar: first_name_ar || null,
      last_name_ar: last_name_ar || null,
      phone: phone || null,
      email,
      role: 'group_leader',
      status: 'active',
      church_id: callerProfile.church_id,
    })
    .eq('id', authData.user.id)
    .select('id, first_name, last_name, first_name_ar, last_name_ar')
    .single()

  if (updateError) {
    console.error('[/api/leaders/register POST]', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Send password reset email so the leader can set their own password
  await adminSupabase.auth.resetPasswordForEmail(email)

  return NextResponse.json({ data: profile, created: true }, { status: 201 })
}
