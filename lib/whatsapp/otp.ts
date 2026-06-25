// WhatsApp OTP delivery via the Meta WhatsApp Cloud API (direct — no BSP/Twilio).
//
// This is the cheapest delivery path for phone-OTP login: Supabase still generates,
// verifies the code, and mints the session via the Send-SMS auth hook — we only
// deliver the message. Cost is Meta's authentication-conversation rate.
//
// Provider abstraction:
//   - Credentials unset  → DEV mode: log the OTP (testable locally / with Supabase
//                          test-OTP numbers) and return. Never logs the OTP in
//                          production once credentials are configured.
//   - Credentials set    → POST an authentication-category template message to the
//                          Cloud API Graph endpoint.

import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

const GRAPH_API_VERSION = 'v21.0'

/**
 * Map an app locale to a WhatsApp template language code.
 * Authentication templates are typically created per-language; we only need the
 * base language here (Arabic is primary, English fallback).
 */
function templateLanguage(locale?: string): 'ar' | 'en' {
  if (!locale) return 'ar'
  return locale.toLowerCase().startsWith('en') ? 'en' : 'ar'
}

/**
 * Normalize a phone number for the Cloud API `to` field: digits only, no leading
 * "+" (Meta accepts E.164 without the plus).
 */
function normalizeTo(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

/** Mask a phone number for logs — keep only the last 3 digits (PII minimization). */
function maskPhone(phone: string): string {
  const d = phone.replace(/[^\d]/g, '')
  return d.length <= 3 ? '***' : `***${d.slice(-3)}`
}

/**
 * Build the Cloud API request body for an authentication-category template.
 *
 * WhatsApp authentication templates require the OTP code in BOTH:
 *   - the body parameter, and
 *   - the URL copy-code button (sub_type 'url', index '0').
 * See Meta's "Authentication templates" docs.
 */
export function buildOtpTemplatePayload(
  phone: string,
  otp: string,
  opts?: { template?: string; locale?: string }
) {
  return {
    messaging_product: 'whatsapp',
    to: normalizeTo(phone),
    type: 'template',
    template: {
      name: opts?.template ?? config.whatsapp.otpTemplate,
      language: { code: templateLanguage(opts?.locale) },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otp }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }],
        },
      ],
    },
  }
}

/**
 * Deliver a one-time passcode over WhatsApp.
 *
 * @throws when the Cloud API returns a non-2xx response (so the Send-SMS hook can
 *         surface a 500 to Supabase and the OTP request fails closed).
 */
export async function sendWhatsAppOtp(
  phone: string,
  otp: string,
  opts?: { locale?: string }
): Promise<void> {
  const { otpPhoneNumberId, otpAccessToken } = config.whatsapp

  // No Cloud API credentials configured.
  if (!otpPhoneNumberId || !otpAccessToken) {
    // SEC-1: fail closed in production — a missing-creds misconfiguration must NEVER
    // silently log live OTPs to production logs. Only surface the code outside prod.
    if (config.app.env === 'production') {
      logger.error('WhatsApp OTP misconfigured: Cloud API credentials missing in production', {
        module: 'whatsapp-otp',
        phone: maskPhone(phone),
      })
      throw new Error('WhatsApp OTP delivery is not configured')
    }
    // DEV/test only: surface the OTP so it's testable locally and with Supabase
    // test-OTP numbers.
    logger.info('WhatsApp OTP (dev mode — no Cloud API credentials configured)', {
      module: 'whatsapp-otp',
      phone: maskPhone(phone),
      otp,
    })
    return
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${otpPhoneNumberId}/messages`
  const body = buildOtpTemplatePayload(phone, otp, opts)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${otpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    // Network/transport failure — never logs the OTP.
    logger.error('WhatsApp OTP send failed (network error)', {
      module: 'whatsapp-otp',
      phone: maskPhone(phone),
      error,
    })
    throw error instanceof Error ? error : new Error('WhatsApp OTP network error')
  }

  if (!res.ok) {
    // Read the Cloud API error for diagnostics — never logs the OTP.
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      detail = '<unreadable response body>'
    }
    logger.error('WhatsApp OTP send failed (non-2xx from Cloud API)', {
      module: 'whatsapp-otp',
      phone: maskPhone(phone),
      status: res.status,
      detail,
    })
    throw new Error(`WhatsApp Cloud API responded ${res.status}`)
  }

  logger.info('WhatsApp OTP delivered', {
    module: 'whatsapp-otp',
    phone: maskPhone(phone),
  })
}
