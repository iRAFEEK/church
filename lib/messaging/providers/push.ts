import type { MessagePayload, MessageResult, MessageProvider } from '../types'
import { getAdminMessaging, isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Firebase Cloud Messaging (FCM) push notification provider.
 * Sends to all registered devices for a given profile_id.
 * Automatically cleans up stale/expired tokens.
 */
class FCMPushProvider implements MessageProvider {
  isConfigured(): boolean {
    return isFirebaseAdminConfigured()
  }

  async send(payload: MessagePayload): Promise<MessageResult> {
    if (!this.isConfigured()) {
      logger.warn('Firebase Admin not configured — skipping push send', { module: 'messaging' })
      return { success: false, error: 'Firebase Admin not configured' }
    }

    try {
      const supabase = await createAdminClient()

      // Fetch all FCM tokens for this profile
      const { data: tokenRows, error: fetchError } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('profile_id', payload.to)

      if (fetchError) {
        logger.error('Failed to fetch push tokens', { module: 'messaging', error: fetchError.message })
        return { success: false, error: fetchError.message }
      }

      if (!tokenRows || tokenRows.length === 0) {
        return { success: false, error: 'No push tokens registered for this profile' }
      }

      const tokens = tokenRows.map((r) => r.token)
      const title = payload.params._title || 'Ekklesia'
      const body = payload.params._body || ''
      const referenceId = payload.params._referenceId || ''
      const referenceType = payload.params._referenceType || ''

      const messaging = getAdminMessaging()

      const message = {
        tokens,
        notification: { title, body },
        data: {
          type: payload.template,
          referenceId,
          referenceType,
          url: this.buildUrl(referenceType, referenceId),
        },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: payload.template,
          },
          fcmOptions: {
            link: this.buildUrl(referenceType, referenceId),
          },
        },
      }

      const response = await messaging.sendEachForMulticast(message)

      // Clean up stale/expired tokens
      type SendResult = { success: boolean; error?: { code: string; message: string } }
      const staleTokens = response.responses
        .map((r: SendResult, i: number) => ({ result: r, token: tokens[i] }))
        .filter(({ result }: { result: SendResult; token: string }) =>
          result.error?.code === 'messaging/registration-token-not-registered' ||
          result.error?.code === 'messaging/invalid-registration-token'
        )
        .map(({ token }: { result: SendResult; token: string }) => token)

      if (staleTokens.length > 0) {
        await supabase.from('push_tokens').delete().in('token', staleTokens)
        logger.info(`Cleaned up ${staleTokens.length} stale push token(s)`, { module: 'messaging' })
      }

      const successCount = response.successCount
      if (successCount === 0) {
        return { success: false, error: 'All FCM sends failed' }
      }

      return { success: true, messageId: `multicast:${successCount}/${tokens.length}` }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Push send error', { module: 'messaging', error })
      return { success: false, error: msg }
    }
  }

  private buildUrl(referenceType: string, referenceId: string): string {
    if (!referenceType || !referenceId) return '/'
    switch (referenceType) {
      case 'visitor':    return `/admin/visitors`
      case 'event':      return `/events/${referenceId}`
      case 'group':      return `/groups/${referenceId}`
      case 'prayer':     return `/prayer`
      case 'serving':    return `/serving`
      default:           return '/notifications'
    }
  }
}

export const pushProvider: MessageProvider = new FCMPushProvider()
