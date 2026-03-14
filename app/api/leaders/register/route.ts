import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/leaders/register — register a new leader (admin only)
export const POST = apiHandler(async ({ req, profile }) => {
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
    .eq('church_id', profile.church_id)
    .eq('email', email)
    .single()

  if (existingProfile) {
    if (existingProfile.role === 'member') {
      // Promote existing member to group_leader
      await adminSupabase
        .from('profiles')
        .update({ role: 'group_leader', status: 'active' })
        .eq('id', existingProfile.id)
        .eq('church_id', profile.church_id)

      return {
        data: {
          id: existingProfile.id,
          first_name: existingProfile.first_name,
          last_name: existingProfile.last_name,
          first_name_ar: existingProfile.first_name_ar,
          last_name_ar: existingProfile.last_name_ar,
        },
        promoted: true,
      }
    }
    // Already a leader or admin
    return {
      data: {
        id: existingProfile.id,
        first_name: existingProfile.first_name,
        last_name: existingProfile.last_name,
        first_name_ar: existingProfile.first_name_ar,
        last_name_ar: existingProfile.last_name_ar,
      },
      existing: true,
    }
  }

  // Create new auth user
  const tempPassword = crypto.randomUUID()
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { church_id: profile.church_id },
  })

  if (authError || !authData.user) {
    if (authError?.message?.includes('already been registered')) {
      return NextResponse.json(
        { error: 'Email already registered in another church' },
        { status: 409 }
      )
    }
    throw authError
  }

  // Update the auto-created profile with details and role
  const { data: newProfile, error: updateError } = await adminSupabase
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
      church_id: profile.church_id,
    })
    .eq('id', authData.user.id)
    .select('id, first_name, last_name, first_name_ar, last_name_ar')
    .single()

  if (updateError) throw updateError

  // Send password reset email so the leader can set their own password
  await adminSupabase.auth.resetPasswordForEmail(email)

  return NextResponse.json({ data: newProfile, created: true }, { status: 201 })
}, { requireRoles: ['ministry_leader', 'super_admin'], rateLimit: 'strict' })
