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
  }),
  cron: z.object({
    secret: z.string().min(1).optional(),
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
    },
    cron: {
      secret: process.env.CRON_SECRET,
    },
  })

  if (!result.success) {
    // ARCH: In development, log detailed errors. In production, fail fast.
    const formatted = result.error.errors
      .map(e => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    console.error(`[CONFIG] Invalid configuration:\n${formatted}`)
    // Don't throw in development — allow partial config for local dev
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid configuration:\n${formatted}`)
    }
  }

  return (result.success ? result.data : result.error) as AppConfig
}

export const config = loadConfig()
