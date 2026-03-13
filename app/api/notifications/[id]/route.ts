import { apiHandler } from '@/lib/api/handler'

// PATCH /api/notifications/[id] — mark a notification as read
export const PATCH = apiHandler(async ({ supabase, user, params }) => {
  const id = params?.id
  if (!id) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('notifications_log')
    .update({ read_at: new Date().toISOString(), status: 'read' })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[/api/notifications/[id] PATCH]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  return { data }
})
