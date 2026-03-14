import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { pushProvider } from '@/lib/messaging/providers/push'

// DEV ONLY — remove before production
// GET /api/push/test — send a test push to the currently logged-in user
export const GET = apiHandler(async ({ user }) => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

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

  return { userId: user.id, result }
}, { rateLimit: 'strict' })
