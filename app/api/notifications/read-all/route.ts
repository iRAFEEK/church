import { apiHandler } from '@/lib/api/handler'

// PATCH /api/notifications/read-all — mark all notifications as read
export const PATCH = apiHandler(async ({ supabase, user }) => {
  const { error } = await supabase
    .from('notifications_log')
    .update({ read_at: new Date().toISOString(), status: 'read' })
    .eq('profile_id', user.id)
    .eq('channel', 'in_app')
    .is('read_at', null)

  if (error) {
    console.error('[/api/notifications/read-all PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return { success: true }
})
