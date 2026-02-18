import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/notifications/read-all — mark all notifications as read
export async function PATCH() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('notifications_log')
    .update({ read_at: new Date().toISOString(), status: 'read' })
    .eq('profile_id', user.id)
    .eq('channel', 'in_app')
    .is('read_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
