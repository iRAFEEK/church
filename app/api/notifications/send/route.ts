import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAudience, type AudienceTarget } from '@/lib/messaging/audience'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { whatsappProvider } from '@/lib/messaging/providers/whatsapp'

// POST /api/notifications/send — send targeted notification (admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['super_admin', 'ministry_leader'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { titleEn, titleAr, bodyEn, bodyAr, targets } = body as {
    titleEn?: string
    titleAr: string
    bodyEn?: string
    bodyAr: string
    targets: AudienceTarget[]
  }

  if (!titleAr || !bodyAr) {
    return NextResponse.json({ error: 'Arabic title and body are required' }, { status: 400 })
  }
  if (!targets?.length) {
    return NextResponse.json({ error: 'At least one target is required' }, { status: 400 })
  }

  const audience = await resolveAudience(profile.church_id, targets)
  const totalTargets = audience.profileIds.length + audience.visitorPhones.length

  if (totalTargets === 0) {
    return NextResponse.json({ error: 'No recipients found for the selected targets' }, { status: 400 })
  }

  let sent = 0

  // Send to profiles in batches of 10
  const BATCH_SIZE = 10
  for (let i = 0; i < audience.profileIds.length; i += BATCH_SIZE) {
    const batch = audience.profileIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(profileId =>
        sendNotification({
          profileId,
          churchId: profile.church_id,
          type: 'general',
          titleEn: titleEn || titleAr,
          titleAr,
          bodyEn: bodyEn || bodyAr,
          bodyAr,
          referenceType: 'broadcast',
        })
      )
    )
    sent += results.filter(r => r.status === 'fulfilled').length
  }

  // Send to visitors via WhatsApp (no profile)
  for (const visitor of audience.visitorPhones) {
    try {
      if (whatsappProvider.isConfigured()) {
        await whatsappProvider.send({
          to: visitor.phone,
          template: 'general_message',
          params: { title: titleAr, body: bodyAr },
          channel: 'whatsapp',
          locale: 'ar',
        })
        sent++
      }
    } catch {
      // Continue sending to others
    }
  }

  return NextResponse.json({ sent, targets: totalTargets })
}
