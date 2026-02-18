import type { MessagePayload, MessageResult, MessageProvider } from '../types'

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://waba.360dialog.io/v1'

/**
 * 360dialog WhatsApp Business API provider.
 *
 * To swap to another provider (e.g. Twilio):
 * 1. Create a new class implementing MessageProvider
 * 2. Update the export below
 *
 * 360dialog REST API docs: https://docs.360dialog.com/
 */
class Dialog360Provider implements MessageProvider {
  isConfigured(): boolean {
    return !!WHATSAPP_API_KEY
  }

  async send(payload: MessagePayload): Promise<MessageResult> {
    if (!this.isConfigured()) {
      console.warn('[WhatsApp] API key not configured — skipping send')
      return { success: false, error: 'WhatsApp API key not configured' }
    }

    try {
      // Format phone number (ensure it starts with country code, no +)
      const phone = payload.to.replace(/[^0-9]/g, '')

      const response = await fetch(`${WHATSAPP_API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'D360-API-KEY': WHATSAPP_API_KEY!,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: payload.template,
            language: {
              code: payload.locale === 'ar' ? 'ar' : 'en',
            },
            components: this.buildComponents(payload.params),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`
        console.error('[WhatsApp] Send failed:', errorMsg)
        return { success: false, error: errorMsg }
      }

      const data = await response.json()
      const messageId = data?.messages?.[0]?.id

      return { success: true, messageId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[WhatsApp] Send error:', msg)
      return { success: false, error: msg }
    }
  }

  private buildComponents(params: Record<string, string>) {
    const values = Object.values(params)
    if (values.length === 0) return []

    return [
      {
        type: 'body',
        parameters: values.map(value => ({
          type: 'text',
          text: value,
        })),
      },
    ]
  }
}

// Export singleton — swap this to change provider
export const whatsappProvider: MessageProvider = new Dialog360Provider()
