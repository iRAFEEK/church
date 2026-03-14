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
  } else {
    // Subsequent join: just add to user_churches (don't change active church)
    const { error: insertError } = await supabase
      .from('user_churches')
      .insert({ user_id: user.id, church_id, role: 'member' })

    if (insertError && !insertError.message.includes('duplicate')) {
      throw insertError
    }
  }

  return { success: true }
}, { rateLimit: 'strict' })
