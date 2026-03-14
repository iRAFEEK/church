import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { SendNotificationSchema } from '@/lib/schemas/notification-send'
import { resolveAudience } from '@/lib/messaging/audience'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { whatsappProvider } from '@/lib/messaging/providers/whatsapp'
import { getSendableScopes, validateTargetsAgainstScopes } from '@/lib/messaging/scopes'
import { NextResponse } from 'next/server'

// POST /api/notifications/send — send targeted notification (role-scoped)
export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
  const scopes = await getSendableScopes(user.id, profile.church_id, profile.role)
  if (!scopes.canSend) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { titleEn, titleAr, bodyEn, bodyAr, targets, imageUrl, linkUrl } = validate(SendNotificationSchema, await req.json())

  const validation = validateTargetsAgainstScopes(targets, scopes)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 403 })
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
          data: {
            ...(imageUrl ? { imageUrl } : {}),
            ...(linkUrl ? { linkUrl } : {}),
          },
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
})
