import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/** Get admin client for notification reads/writes (bypasses RLS for cross-church). */
async function getAdminOrFallback() {
  try {
    return await createAdminClient()
  } catch {
    return await createClient()
  }
}
import { whatsappProvider } from './providers/whatsapp'
import { emailProvider } from './providers/email'
import { inAppProvider } from './providers/in-app'
import { pushProvider } from './providers/push'
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

  // Get profile info for phone/email if not provided.
  // Also resolves the recipient church's WhatsApp-notification opt-in flag — the
  // paid WhatsApp channel is only used when the church has explicitly enabled it.
  const { phone, email, locale, whatsappEnabled } = await getProfileContactInfo(
    request.profileId,
    request.phone,
    request.email
  )

  const template = TEMPLATES[request.type]
  const isAr = locale.startsWith('ar')

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

  // 2. WhatsApp — paid channel, only when the recipient's church has opted in.
  //    When the church has NOT enabled WhatsApp notifications, drop the channel and
  //    rely on the free channels (push + in-app, and email if used). A user whose
  //    notification_pref is 'whatsapp' gracefully falls back this way.
  //    NOTE: this does NOT affect WhatsApp OTP/verification (separate auth flow).
  if (channels.includes('whatsapp') && whatsappEnabled && phone && template) {
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


  // 4. Push (if in channels and Firebase is configured)
  if (channels.includes('push') && pushProvider.isConfigured()) {
    results.push = await pushProvider.send({
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
      channel: 'push',
      locale,
    })

    await logNotification(request, 'push', results.push)
  }

  return { results: results as Record<MessageChannel, MessageResult> }
}

/**
 * Resolve which channels to send to based on user's notification_pref.
 */
async function resolveChannels(profileId: string): Promise<MessageChannel[]> {
  try {
    const supabase = await getAdminOrFallback()
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
      case 'push': return ['push', 'in_app']
      case 'all': return ['whatsapp', 'email', 'push', 'in_app']
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
): Promise<{ phone: string | null; email: string | null; locale: 'ar' | 'en'; whatsappEnabled: boolean }> {
  try {
    const supabase = await getAdminOrFallback()
    const { data } = await supabase
      .from('profiles')
      .select('phone, email, church_id')
      .eq('id', profileId)
      .single()

    // Determine locale from church primary_language and read the WhatsApp-notification
    // opt-in flag in the same lookup (one church query per send — no N+1).
    let locale: 'ar' | 'en' = 'ar'
    let whatsappEnabled = false
    if (data?.church_id) {
      const { data: church } = await supabase
        .from('churches')
        .select('primary_language, whatsapp_notifications_enabled')
        .eq('id', data.church_id)
        .single()
      if (church?.primary_language === 'en') locale = 'en'
      whatsappEnabled = church?.whatsapp_notifications_enabled === true
    }

    return {
      phone: overridePhone || data?.phone || null,
      email: overrideEmail || data?.email || null,
      locale,
      whatsappEnabled,
    }
  } catch {
    // Fail closed for the paid channel: if we cannot confirm the church opted in,
    // do not send paid WhatsApp messages.
    return { phone: overridePhone || null, email: overrideEmail || null, locale: 'ar', whatsappEnabled: false }
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
    const supabase = await getAdminOrFallback()
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
    logger.error('Failed to log notification', { module: 'messaging', churchId: request.churchId, error })
  }
}
