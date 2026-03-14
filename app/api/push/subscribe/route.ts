import { apiHandler, ValidationError } from '@/lib/api/handler'

// POST /api/push/subscribe — register a push notification token
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const { token, deviceHint } = body

  if (!token || typeof token !== 'string') {
    throw new ValidationError('Invalid token', { token: 'Token is required' })
  }

  // Upsert the token — idempotent, safe to call on every app open
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        profile_id: user.id,
        church_id: profile.church_id,
        token,
        device_hint: deviceHint || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,token' }
    )

  if (error) throw error

  return { success: true }
}, { rateLimit: 'strict' })
