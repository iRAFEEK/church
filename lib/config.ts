// ARCH: Single validated config module. All environment variable access goes through here.
// Fails fast at startup with clear error messages instead of cryptic runtime failures.

import { z } from 'zod'

const ConfigSchema = z.object({
  supabase: z.object({
    url: z.string().url(),
    anonKey: z.string().min(1),
    serviceRoleKey: z.string().min(1).optional(),
  }),
  app: z.object({
    url: z.string().url().default('http://localhost:3000'),
    env: z.enum(['development', 'test', 'production']).default('development'),
  }),
  resend: z.object({
    apiKey: z.string().min(1).optional(),
    fromEmail: z.string().email().optional(),
  }),
  whatsapp: z.object({
    apiKey: z.string().min(1).optional(),
    apiUrl: z.string().url().optional(),
    webhookSecret: z.string().min(1).optional(),
    // Meta WhatsApp Cloud API — used directly for OTP delivery via the
    // Supabase Send-SMS auth hook (separate from the 360dialog messaging path above).
    otpPhoneNumberId: z.string().min(1).optional(),
    otpAccessToken: z.string().min(1).optional(),
    otpTemplate: z.string().min(1).default('otp_login'),
  }),
  auth: z.object({
    // Standard Webhooks symmetric secret for verifying the Supabase Send-SMS hook.
    // Format: "v1,whsec_<base64>". Fail closed if unset.
    sendSmsHookSecret: z.string().min(1).optional(),
  }),
  cron: z.object({
    secret: z.string().min(1).optional(),
  }),
  posthog: z.object({
    publicKey: z.string().min(1).optional(),
    host: z.string().url().optional(),
    serverKey: z.string().min(1).optional(),
  }),
  sentry: z.object({
    dsn: z.string().min(1).optional(),
    org: z.string().min(1).optional(),
    project: z.string().min(1).optional(),
  }),
})

export type AppConfig = z.infer<typeof ConfigSchema>

function loadConfig(): AppConfig {
  const result = ConfigSchema.safeParse({
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL,
      env: process.env.NODE_ENV,
    },
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
    },
    whatsapp: {
      apiKey: process.env.WHATSAPP_API_KEY,
      apiUrl: process.env.WHATSAPP_API_URL,
      webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET,
      otpPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      otpAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      otpTemplate: process.env.WHATSAPP_OTP_TEMPLATE,
    },
    auth: {
      sendSmsHookSecret: process.env.SEND_SMS_HOOK_SECRET,
    },
    cron: {
      secret: process.env.CRON_SECRET,
    },
    posthog: {
      publicKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      serverKey: process.env.POSTHOG_PROJECT_API_KEY,
    },
    sentry: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
  })

  if (!result.success) {
    // ARCH: In development, log detailed errors. In production, fail fast.
    const formatted = result.error.errors
      .map(e => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    // Logger not available yet (config loads first), use console directly
    console.error(`[CONFIG] Invalid configuration:\n${formatted}`)
    // Don't throw in development — allow partial config for local dev
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid configuration:\n${formatted}`)
    }
  }

  return (result.success ? result.data : result.error) as AppConfig
}

export const config = loadConfig()
