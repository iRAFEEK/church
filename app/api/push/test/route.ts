import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pushProvider } from '@/lib/messaging/providers/push'

// DEV ONLY — remove before production
// Send a test push to the currently logged-in user
// GET /api/push/test
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await pushProvider.send({
    to: user.id,
    template: 'general',
    params: {
      _title: '🔔 Test Push Notification',
      _body: 'Push notifications are working correctly!',
      _churchId: '',
      _referenceId: '',
      _referenceType: '',
    },
    channel: 'push',
  })

  return NextResponse.json({ userId: user.id, result })
}
