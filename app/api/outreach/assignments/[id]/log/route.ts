import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { LogOutreachVisitSchema } from '@/lib/schemas/outreach'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/outreach/assignments/[id]/log — the assignee logs the visit they were
// assigned (any authenticated role) and the assignment is marked completed.
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const body = validate(LogOutreachVisitSchema, await req.json())
  const churchId = profile.church_id
  const id = params?.id

  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify with the user-bound client that the assignment exists in the caller's
  // church AND is assigned to the caller. This check is the security guard for the
  // admin-client writes below.
  const { data: assignment } = await supabase
    .from('outreach_assignments')
    .select('id, member_id, assigned_to, status')
    .eq('id', id)
    .eq('church_id', churchId)
    .single()

  if (!assignment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (assignment.assigned_to !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (assignment.status !== 'pending' && assignment.status !== 'in_progress') {
    // Already completed or cancelled — nothing to log against.
    return NextResponse.json({ error: 'Assignment is not active' }, { status: 409 })
  }

  // The outreach_visits INSERT RLS policy is leader-gated (can_manage_outreach), but
  // an assigned member must be able to log their own assigned visit. The admin client
  // is safe here because the assignment ownership + church scoping were verified
  // above, and profile_id/visited_by/church_id are derived server-side (never from
  // the request body).
  const admin = await createAdminClient()

  const { data: visit, error: visitError } = await admin
    .from('outreach_visits')
    .insert({
      church_id: churchId,
      profile_id: assignment.member_id,
      visited_by: profile.id,
      visit_date: body.visit_date || new Date().toISOString().split('T')[0],
      notes: body.notes || null,
      needs_followup: body.needs_followup,
      followup_date: body.followup_date || null,
      followup_notes: body.followup_notes || null,
    })
    .select('id, church_id, profile_id, visited_by, visit_date, notes, needs_followup, followup_date, followup_notes, created_at')
    .single()

  if (visitError) throw visitError

  // Mark the assignment done.
  const { error: updateError } = await admin
    .from('outreach_assignments')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('church_id', churchId)

  if (updateError) throw updateError

  revalidateTag(`outreach-${churchId}`)
  revalidateTag(`dashboard-${churchId}`)
  return NextResponse.json({ data: visit }, { status: 201 })
})
