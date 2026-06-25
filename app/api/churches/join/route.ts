import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { JoinChurchSchema } from '@/lib/schemas/church'

// POST /api/churches/join — join a church (during onboarding or subsequently)
export const POST = apiHandler(async ({ req, supabase, user }) => {
  const { church_id } = validate(JoinChurchSchema, await req.json())

  // Verify target church exists and is active
  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id')
    .eq('id', church_id)
    .eq('is_active', true)
    .single()

  if (churchError || !church) {
    return Response.json({ error: 'Church not found' }, { status: 404 })
  }

  // Check if this is during onboarding (first join) or a subsequent join
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!profile.onboarding_completed) {
    // During onboarding: clear any auto-assigned seed church from user_churches
    // then insert the real church
    await supabase
      .from('user_churches')
      .delete()
      .eq('user_id', user.id)

    const { error: insertError } = await supabase
      .from('user_churches')
      .insert({ user_id: user.id, church_id, role: 'member' })

    if (insertError) throw insertError

    // Set as active church on profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ church_id })
      .eq('id', user.id)

    if (profileError) throw profileError
    return { success: true, status: 'active' }
  }

  // Subsequent join (already onboarded): this is a REQUEST that a church admin
  // must approve — it does not grant membership instantly.
  // Already an active member of this church?
  const { data: existingMembership } = await supabase
    .from('user_churches')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('church_id', church_id)
    .maybeSingle()

  if (existingMembership) {
    return Response.json({ error: 'Already a member of this church' }, { status: 409 })
  }

  // Already have a pending request?
  const { data: existingRequest } = await supabase
    .from('church_join_requests')
    .select('id')
    .eq('church_id', church_id)
    .eq('profile_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingRequest) {
    return Response.json({ error: 'You already have a pending request for this church' }, { status: 409 })
  }

  // Snapshot the requester's display info onto the request (their profile lives in
  // their home church, which the target church's admins can't read via RLS).
  const { data: me } = await supabase
    .from('profiles')
    .select('first_name, last_name, first_name_ar, last_name_ar, phone, email')
    .eq('id', user.id)
    .single()

  const { error: requestError } = await supabase
    .from('church_join_requests')
    .insert({
      church_id,
      profile_id: user.id,
      status: 'pending',
      requester_name: `${me?.first_name ?? ''} ${me?.last_name ?? ''}`.trim() || null,
      requester_name_ar: `${me?.first_name_ar ?? ''} ${me?.last_name_ar ?? ''}`.trim() || null,
      requester_phone: me?.phone ?? null,
      requester_email: me?.email ?? null,
    })

  if (requestError) throw requestError

  return { success: true, status: 'pending' }
}, { rateLimit: 'strict' })
