import type { MessagePayload, MessageResult, MessageProvider } from '../types'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * In-app notification provider.
 * Inserts notifications into the notifications_log table.
 */
class InAppProvider implements MessageProvider {
  isConfigured(): boolean {
    return true // Always available
  }

  async send(payload: MessagePayload): Promise<MessageResult> {
    try {
      let supabase: any
      try {
        supabase = await createAdminClient()
      } catch {
        supabase = await createClient()
      }

      const { data, error } = await supabase
        .from('notifications_log')
        .insert({
          church_id: payload.params._churchId,
          profile_id: payload.to,  // For in-app, `to` is the profile_id
          type: payload.template,
          channel: 'in_app',
          title: payload.params._title || payload.template,
          body: payload.params._body || '',
          payload: payload.params,
          status: 'sent',
          reference_id: payload.params._referenceId || null,
          reference_type: payload.params._referenceType || null,
          sent_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        logger.error('In-app notification insert failed', { module: 'messaging', error: error.message })
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      logger.error('In-app notification error', { module: 'messaging', error })
      return { success: false, error: msg }
    }
  }
}

export const inAppProvider: MessageProvider = new InAppProvider()
