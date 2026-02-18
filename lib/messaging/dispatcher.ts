import { createClient } from '@/lib/supabase/server'
import { whatsappProvider } from './providers/whatsapp'
import { emailProvider } from './providers/email'
import { inAppProvider } from './providers/in-app'
import { TEMPLATES, interpolate } from './templates'
import type { NotificationRequest, MessageChannel, MessageResult } from './types'

/**
 * Main notification dispatcher.
 * Routes notifications to the correct providers based on user preferences.
 * Always creates an in-app notification.
 * WhatsApp is primary, email is secondary.
 */
export async function sendNotification(request: NotificationRequest): Promise<{
  results: Record<MessageChannel, MessageResult>
}> {
  const results: Record<string, MessageResult> = {}

  // Determine which channels to use
  let channels = request.channels
  if (!channels) {
    // Look up user notification preference
    channels = await resolveChannels(request.profileId)
  }

  // Get profile info for phone/email if not provided
  const { phone, email, locale } = await getProfileContactInfo(request.profileId, request.phone, request.email)

  const template = TEMPLATES[request.type]
  const isAr = locale === 'ar'

  const title = isAr ? request.titleAr : request.titleEn
  const body = isAr ? request.bodyAr : request.bodyEn

  // 1. Always send in-app notification
  results.in_app = await inAppProvider.send({
    to: request.profileId,
    template: request.type,
    params: {
      ...request.data || {},
      _churchId: request.churchId,
      _title: title,
      _body: body,
      _referenceId: request.referenceId || '',
      _referenceType: request.referenceType || '',
    },
    channel: 'in_app',
    locale,
  })

  // 2. WhatsApp (if in channels and phone available)
  if (channels.includes('whatsapp') && phone && template) {
    results.whatsapp = await whatsappProvider.send({
      to: phone,
      template: template.whatsappTemplate,
      params: request.data || {},
      channel: 'whatsapp',
      locale,
    })

    // Log to notifications_log
    await logNotification(request, 'whatsapp', results.whatsapp)
  }

  // 3. Email (if in channels and email available)
  if (channels.includes('email') && email && template) {
    const emailSubject = isAr
      ? interpolate(template.emailSubjectAr, request.data || {})
      : interpolate(template.emailSubjectEn, request.data || {})

    results.email = await emailProvider.send({
      to: email,
      template: request.type,
      params: {
        ...request.data || {},
        subject: emailSubject,
        body: body,
      },
      channel: 'email',
      locale,
    })

    await logNotification(request, 'email', results.email)
  }

  return { results: results as Record<MessageChannel, MessageResult> }
}

/**
 * Resolve which channels to send to based on user's notification_pref.
 */
async function resolveChannels(profileId: string): Promise<MessageChannel[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('notification_pref')
      .eq('id', profileId)
      .single()

    const pref = data?.notification_pref || 'all'
    switch (pref) {
      case 'whatsapp': return ['whatsapp', 'in_app']
      case 'sms': return ['whatsapp', 'in_app'] // SMS falls back to WhatsApp
      case 'email': return ['email', 'in_app']
      case 'all': return ['whatsapp', 'email', 'in_app']
      case 'none': return ['in_app'] // Always at least in-app
      default: return ['whatsapp', 'in_app']
    }
  } catch {
    return ['whatsapp', 'in_app']
  }
}

/**
 * Get contact info from profile.
 */
async function getProfileContactInfo(
  profileId: string,
  overridePhone?: string,
  overrideEmail?: string
): Promise<{ phone: string | null; email: string | null; locale: 'ar' | 'en' }> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('phone, email, church_id')
      .eq('id', profileId)
      .single()

    // Determine locale from church primary_language
    let locale: 'ar' | 'en' = 'ar'
    if (data?.church_id) {
      const { data: church } = await supabase
        .from('churches')
        .select('primary_language')
        .eq('id', data.church_id)
        .single()
      if (church?.primary_language === 'en') locale = 'en'
    }

    return {
      phone: overridePhone || data?.phone || null,
      email: overrideEmail || data?.email || null,
      locale,
    }
  } catch {
    return { phone: overridePhone || null, email: overrideEmail || null, locale: 'ar' }
  }
}

/**
 * Log a notification send attempt to the notifications_log table.
 */
async function logNotification(
  request: NotificationRequest,
  channel: MessageChannel,
  result: MessageResult
) {
  try {
    const supabase = await createClient()
    await supabase.from('notifications_log').insert({
      church_id: request.churchId,
      profile_id: request.profileId,
      type: request.type,
      channel,
      title: request.titleEn,
      body: request.bodyEn,
      payload: request.data || {},
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
      reference_id: request.referenceId || null,
      reference_type: request.referenceType || null,
      sent_at: result.success ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error('[Dispatcher] Failed to log notification:', error)
  }
}
