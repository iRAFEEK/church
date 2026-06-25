// Supabase Send-SMS auth hook endpoint.
//
// Supabase Auth POSTs here whenever a phone OTP needs delivering. We verify the
// Standard Webhooks signature (symmetric secret in SEND_SMS_HOOK_SECRET), then
// hand the code to the WhatsApp Cloud API sender. Supabase owns code generation,
// verification, and session minting — we only deliver the message.
//
// This route is PUBLIC (Supabase, not an app user, calls it) and is allow-listed
// in middleware. It is protected by the signature check, NOT by auth. It fails
// CLOSED: if the secret is unset or the signature is invalid → 403.
//
// Contract: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook

import { NextResponse, type NextRequest } from 'next/server'

import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { sendWhatsAppOtp } from '@/lib/whatsapp/otp'
import { verifySendSmsHook } from '@/lib/whatsapp/verify-hook'

// Hook payload subset we rely on. Supabase sends much more on `user`.
interface SendSmsHookPayload {
  user?: { phone?: string }
  sms?: { otp?: string }
}

/** Build the hook error response shape Supabase expects. */
function hookError(httpCode: number, message: string) {
  return NextResponse.json(
    { error: { http_code: httpCode, message } },
    { status: httpCode }
  )
}

export async function POST(req: NextRequest) {
  // Read the raw body BEFORE parsing — signature is computed over the exact bytes.
  const rawBody = await req.text()

  const result = verifySendSmsHook({
    secret: config.auth.sendSmsHookSecret,
    rawBody,
    headers: {
      id: req.headers.get('webhook-id'),
      timestamp: req.headers.get('webhook-timestamp'),
      signature: req.headers.get('webhook-signature'),
    },
  })

  if (!result.valid) {
    logger.warn('Send-SMS hook rejected (signature verification failed)', {
      module: 'sms-hook',
      reason: result.reason,
    })
    return hookError(403, 'Invalid webhook signature')
  }

  let payload: SendSmsHookPayload
  try {
    payload = JSON.parse(rawBody) as SendSmsHookPayload
  } catch {
    return hookError(400, 'Invalid JSON payload')
  }

  const phone = payload.user?.phone
  const otp = payload.sms?.otp
  if (!phone || !otp) {
    logger.warn('Send-SMS hook missing phone or otp', { module: 'sms-hook' })
    return hookError(400, 'Missing phone or otp')
  }

  try {
    await sendWhatsAppOtp(phone, otp)
  } catch (error) {
    logger.error('Send-SMS hook failed to deliver OTP', {
      module: 'sms-hook',
      error,
    })
    return hookError(500, 'Failed to deliver verification code')
  }

  // Empty 200 body = success per the hook contract.
  return NextResponse.json({})
}
