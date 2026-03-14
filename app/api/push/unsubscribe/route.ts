import { apiHandler, ValidationError } from '@/lib/api/handler'

// DELETE /api/push/unsubscribe — remove a push notification token
export const DELETE = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const { token } = body

  if (!token || typeof token !== 'string') {
    throw new ValidationError('Invalid token', { token: 'Token is required' })
  }

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)
    .eq('token', token)

  if (error) throw error

  return { success: true }
}, { rateLimit: 'strict' })
