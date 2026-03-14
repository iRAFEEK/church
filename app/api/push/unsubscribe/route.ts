import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UnsubscribePushSchema } from '@/lib/schemas/push'

// DELETE /api/push/unsubscribe — remove a push notification token
export const DELETE = apiHandler(async ({ req, supabase, user, profile }) => {
  const { token } = validate(UnsubscribePushSchema, await req.json())

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('profile_id', user.id)
    .eq('church_id', profile.church_id)
    .eq('token', token)

  if (error) throw error

  return { success: true }
}, { rateLimit: 'strict' })
