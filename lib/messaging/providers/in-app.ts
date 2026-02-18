import type { MessagePayload, MessageResult, MessageProvider } from '../types'
import { createClient } from '@/lib/supabase/server'

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
      const supabase = await createClient()

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
        console.error('[InApp] Insert failed:', error.message)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[InApp] Error:', msg)
      return { success: false, error: msg }
    }
  }
}

export const inAppProvider: MessageProvider = new InAppProvider()
