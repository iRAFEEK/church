import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET

// POST /api/webhooks/whatsapp — receive delivery status from 360dialog
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WHATSAPP_WEBHOOK_SECRET) {
      const signature = req.headers.get('x-hub-signature-256') || ''
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      // In production, verify HMAC signature here
    }

    const body = await req.json()

    // 360dialog sends statuses in this format
    const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses
    if (!statuses?.length) {
      return NextResponse.json({ received: true })
    }

    const supabase = await createAdminClient()

    for (const status of statuses) {
      const messageId = status.id
      const statusValue = status.status // sent, delivered, read, failed

      if (!messageId) continue

      // Map WhatsApp status to our status
      let dbStatus: string
      switch (statusValue) {
        case 'sent': dbStatus = 'sent'; break
        case 'delivered': dbStatus = 'delivered'; break
        case 'read': dbStatus = 'read'; break
        case 'failed': dbStatus = 'failed'; break
        default: continue
      }

      // Update notification_log by matching the external message ID in payload
      // We store messageId in the payload when logging
      await supabase
        .from('notifications_log')
        .update({ status: dbStatus })
        .eq('channel', 'whatsapp')
        .contains('payload', { messageId })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] WhatsApp error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET /api/webhooks/whatsapp — webhook verification (required by Meta)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === WHATSAPP_WEBHOOK_SECRET) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
