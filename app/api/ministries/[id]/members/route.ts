import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import {
  AddMinistryMemberSchema,
  UpdateMinistryMemberSchema,
  RemoveMinistryMemberSchema,
} from '@/lib/schemas/ministry'

// POST /api/ministries/[id]/members — add member to ministry
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params!.id
  const body = validate(AddMinistryMemberSchema, await req.json())

  // Upsert — re-activates if previously removed
  const { data, error } = await supabase
    .from('ministry_members')
    .upsert({
      ministry_id,
      profile_id: body.profile_id,
      church_id: profile.church_id,
      role_in_ministry: body.role_in_ministry,
      is_active: true,
    }, { onConflict: 'ministry_id,profile_id' })
    .select('id, ministry_id, profile_id, church_id, role_in_ministry, is_active, joined_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Auto role upgrade: if assigned as leader, upgrade profile role
  if (body.role_in_ministry === 'leader') {
    await autoUpgradeRole(supabase, body.profile_id)
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// PATCH /api/ministries/[id]/members — update member role
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params!.id
  const body = validate(UpdateMinistryMemberSchema, await req.json())

  const { data, error } = await supabase
    .from('ministry_members')
    .update({ role_in_ministry: body.role_in_ministry })
    .eq('ministry_id', ministry_id)
    .eq('profile_id', body.profile_id)
    .eq('church_id', profile.church_id)
    .select('id, ministry_id, profile_id, church_id, role_in_ministry, is_active, joined_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Auto role upgrade if promoted to leader
  if (body.role_in_ministry === 'leader') {
    await autoUpgradeRole(supabase, body.profile_id)
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

// DELETE /api/ministries/[id]/members — soft-remove member
export const DELETE = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params!.id
  const body = validate(RemoveMinistryMemberSchema, await req.json())

  // Soft remove
  const { error } = await supabase
    .from('ministry_members')
    .update({ is_active: false })
    .eq('ministry_id', ministry_id)
    .eq('profile_id', body.profile_id)
    .eq('church_id', profile.church_id)

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ success: true })
}, { requireRoles: ['ministry_leader', 'super_admin'] })

/** Auto-upgrade profile role to ministry_leader when assigned as ministry leader */
async function autoUpgradeRole(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  profileId: string
) {
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
