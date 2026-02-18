import type { MessagePayload, MessageResult, MessageProvider } from '../types'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@ekklesia.app'

/**
 * Resend email provider.
 *
 * To swap to another provider (e.g. SendGrid, AWS SES):
 * 1. Create a new class implementing MessageProvider
 * 2. Update the export below
 */
class ResendProvider implements MessageProvider {
  private resend: any = null

  isConfigured(): boolean {
    return !!RESEND_API_KEY
  }

  private async getClient() {
    if (!this.resend) {
      const { Resend } = await import('resend')
      this.resend = new Resend(RESEND_API_KEY)
    }
    return this.resend
  }

  async send(payload: MessagePayload): Promise<MessageResult> {
    if (!this.isConfigured()) {
      console.warn('[Email] Resend API key not configured — skipping send')
      return { success: false, error: 'Resend API key not configured' }
    }

    try {
      const resend = await this.getClient()

      // Build simple HTML email from params
      const subject = payload.params.subject || payload.template
      const body = payload.params.body || Object.values(payload.params).join('\n')

      const { data, error } = await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: payload.to,
        subject,
        html: this.buildHtml(body, payload.locale),
      })

      if (error) {
        console.error('[Email] Send failed:', error.message)
        return { success: false, error: error.message }
      }

      return { success: true, messageId: data?.id }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Email] Send error:', msg)
      return { success: false, error: msg }
    }
  }

  private buildHtml(body: string, locale?: string): string {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    const fontFamily = locale === 'ar'
      ? "'Noto Sans Arabic', 'Segoe UI', sans-serif"
      : "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"

    return `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${locale || 'en'}">
      <head><meta charset="utf-8"></head>
      <body style="font-family: ${fontFamily}; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px;">
          <h2 style="color: #111; margin-top: 0;">Ekklesia</h2>
          <div style="white-space: pre-line;">${body}</div>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 16px; text-align: center;">
          Ekklesia Church Management
        </p>
      </body>
      </html>
    `
  }
}

export const emailProvider: MessageProvider = new ResendProvider()
