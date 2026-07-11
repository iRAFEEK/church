import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { SwitchChurchSchema } from '@/lib/schemas/church'
import { createAdminClient } from '@/lib/supabase/server'
import { isActiveMembership } from '@/lib/membership'

// POST /api/churches/switch — switch active church
export const POST = apiHandler(async ({ req, supabase, user }) => {
  const { church_id } = validate(SwitchChurchSchema, await req.json())

  // Read the user's role for the TARGET church from user_churches
  // This is the authoritative source of per-church roles.
  // Only ACTIVE memberships are switchable — pending/managed/invited/inactive
  // rows must not grant access (migrations 082/084/088).
  const { data: membership } = await supabase
    .from('user_churches')
    .select('role, status')
    .eq('user_id', user.id)
    .eq('church_id', church_id)
    .single()

  if (!membership || !isActiveMembership(membership.status)) {
    return NextResponse.json({ error: 'You are not a member of this church' }, { status: 403 })
  }

  // CRITICAL: Update BOTH church_id AND role atomically
  // This prevents privilege escalation where a super_admin at Church A
  // retains that role when switching to Church B where they are just a member.
  //
  // Service-role client REQUIRED: migration 050's prevent_self_role_escalation
  // trigger blocks a user changing their own church_id/role via the user-bound
  // client (found live on staging 2026-07-11 — switching 500'd for every user).
  // Safe here because membership in the target church was just verified above.
  const admin = await createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      church_id,
      role: membership.role,
    })
    .eq('id', user.id)

  if (error) throw error

  return { success: true }
}, { rateLimit: 'strict' })
