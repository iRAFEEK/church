import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Re-create the ConfigSchema here to avoid triggering module-level side
// effects from importing lib/config.ts (which calls loadConfig() on import).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid config containing only required fields. */
function minimalValidInput() {
  return {
    supabase: {
      url: 'https://abc.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    },
    app: {},
    resend: {},
    whatsapp: {},
    cron: {},
    posthog: {},
    sentry: {},
  }
}

/** Full valid config with every optional field populated. */
function fullValidInput() {
  return {
    supabase: {
      url: 'https://abc.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      serviceRoleKey: 'service-role-key-value',
    },
    app: {
      url: 'https://ekklesia.app',
      env: 'production' as const,
    },
    resend: {
      apiKey: 're_123456',
      fromEmail: 'noreply@ekklesia.app',
    },
    whatsapp: {
      apiKey: 'wa-key',
      apiUrl: 'https://api.whatsapp.example.com',
      webhookSecret: 'wh-secret',
    },
    cron: {
      secret: 'cron-secret-value',
    },
    posthog: {
      publicKey: 'phc_abc123',
      host: 'https://eu.i.posthog.com',
      serverKey: 'phc_server_key',
    },
    sentry: {
      dsn: 'https://sentry.io/123',
      org: 'ekklesia',
      project: 'church-app',
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfigSchema', () => {
  it('parses successfully with only required supabase fields', () => {
    const result = ConfigSchema.safeParse(minimalValidInput())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.supabase.url).toBe('https://abc.supabase.co')
      expect(result.data.supabase.anonKey).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    }
  })

  it('fails when supabase.url is missing', () => {
    const input = minimalValidInput()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.supabase as Record<string, unknown>).url

    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map(e => e.path.join('.'))
      expect(paths).toContain('supabase.url')
    }
  })

  it('fails when supabase.anonKey is missing', () => {
    const input = minimalValidInput()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (input.supabase as Record<string, unknown>).anonKey

    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map(e => e.path.join('.'))
      expect(paths).toContain('supabase.anonKey')
    }
  })

  it('accepts config when optional sections are empty objects', () => {
    const input = minimalValidInput()
    // All optional sections are already empty objects in minimalValidInput
    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.resend.apiKey).toBeUndefined()
      expect(result.data.whatsapp.apiKey).toBeUndefined()
      expect(result.data.cron.secret).toBeUndefined()
      expect(result.data.posthog.publicKey).toBeUndefined()
      expect(result.data.sentry.dsn).toBeUndefined()
    }
  })

  it('defaults app.url to http://localhost:3000 when not provided', () => {
    const input = minimalValidInput()
    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.app.url).toBe('http://localhost:3000')
    }
  })

  it('defaults app.env to development when not provided', () => {
    const input = minimalValidInput()
    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.app.env).toBe('development')
    }
  })

  it('fails when supabase.url is not a valid URL', () => {
    const input = minimalValidInput()
    input.supabase.url = 'not-a-url'

    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map(e => e.path.join('.'))
      expect(paths).toContain('supabase.url')
    }
  })

  it('has all expected top-level keys', () => {
    const shape = ConfigSchema.shape
    const keys = Object.keys(shape)

    expect(keys).toContain('supabase')
    expect(keys).toContain('app')
    expect(keys).toContain('resend')
    expect(keys).toContain('whatsapp')
    expect(keys).toContain('cron')
    expect(keys).toContain('posthog')
    expect(keys).toContain('sentry')
    expect(keys).toHaveLength(7)
  })

  it('parses a full config with all optional fields', () => {
    const input = fullValidInput()
    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.supabase.serviceRoleKey).toBe('service-role-key-value')
      expect(result.data.app.env).toBe('production')
      expect(result.data.resend.apiKey).toBe('re_123456')
      expect(result.data.resend.fromEmail).toBe('noreply@ekklesia.app')
      expect(result.data.whatsapp.apiUrl).toBe('https://api.whatsapp.example.com')
      expect(result.data.cron.secret).toBe('cron-secret-value')
      expect(result.data.posthog.host).toBe('https://eu.i.posthog.com')
      expect(result.data.sentry.org).toBe('ekklesia')
    }
  })

  it('fails when resend.fromEmail is not a valid email', () => {
    const input = minimalValidInput()
    ;(input.resend as Record<string, unknown>).fromEmail = 'not-an-email'

    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map(e => e.path.join('.'))
      expect(paths).toContain('resend.fromEmail')
    }
  })
})
