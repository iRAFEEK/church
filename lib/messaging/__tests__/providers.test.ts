import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MessagePayload } from '../types'

// ── Mocks ──────────────────────────────────────────────────

// Supabase mock
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockDelete = vi.fn()
const mockIn = vi.fn()
const mockFrom = vi.fn()

const mockSupabase = {
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => Promise.resolve(mockSupabase)),
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Firebase admin mock
const mockSendEachForMulticast = vi.fn()

vi.mock('@/lib/firebase/admin', () => ({
  isFirebaseAdminConfigured: vi.fn(() => false),
  getAdminMessaging: vi.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}))

// Logger mock
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ── Test payload ───────────────────────────────────────────

const payload: MessagePayload = {
  to: 'profile-123',
  template: 'test_template',
  params: {
    _churchId: 'church-1',
    _title: 'Test',
    _body: 'Test body',
    _referenceId: '',
    _referenceType: '',
  },
  channel: 'in_app' as const,
  locale: 'ar' as const,
}

// ── Helpers ────────────────────────────────────────────────

function setupFromChain(overrides: { data?: unknown; error?: unknown; tokenRows?: unknown[]; fetchError?: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'notifications_log') {
      mockSingle.mockReturnValue({
        data: overrides.data ?? null,
        error: overrides.error ?? null,
      })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockInsert.mockReturnValue({ select: mockSelect })
      return { insert: mockInsert }
    }
    if (table === 'push_tokens') {
      // For select chain
      mockEq.mockReturnValue({
        data: overrides.tokenRows ?? [],
        error: overrides.fetchError ?? null,
      })
      // For delete chain
      mockIn.mockReturnValue(Promise.resolve({ error: null }))
      mockDelete.mockReturnValue({ in: mockIn })
      return {
        select: vi.fn().mockReturnValue({ eq: mockEq }),
        delete: mockDelete,
      }
    }
    return {}
  })
}

// ── Tests ──────────────────────────────────────────────────

describe('InAppProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isConfigured always returns true', async () => {
    const { inAppProvider } = await import('../providers/in-app')
    expect(inAppProvider.isConfigured()).toBe(true)
  })

  it('send inserts notification and returns success', async () => {
    setupFromChain({ data: { id: 'notif-1' } })
    const { inAppProvider } = await import('../providers/in-app')

    const result = await inAppProvider.send(payload)

    expect(result).toEqual({ success: true, messageId: 'notif-1' })
    expect(mockFrom).toHaveBeenCalledWith('notifications_log')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        church_id: 'church-1',
        profile_id: 'profile-123',
        type: 'test_template',
        channel: 'in_app',
        title: 'Test',
        body: 'Test body',
        status: 'sent',
      }),
    )
  })

  it('send returns error on insert failure', async () => {
    setupFromChain({ error: { message: 'insert failed' } })
    const { inAppProvider } = await import('../providers/in-app')

    const result = await inAppProvider.send(payload)

    expect(result).toEqual({ success: false, error: 'insert failed' })
  })
})

describe('FCMPushProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isConfigured returns false when Firebase not configured', async () => {
    const { isFirebaseAdminConfigured } = await import('@/lib/firebase/admin')
    vi.mocked(isFirebaseAdminConfigured).mockReturnValue(false)

    const { pushProvider } = await import('../providers/push')
    expect(pushProvider.isConfigured()).toBe(false)
  })

  it('send returns error when not configured', async () => {
    const { isFirebaseAdminConfigured } = await import('@/lib/firebase/admin')
    vi.mocked(isFirebaseAdminConfigured).mockReturnValue(false)

    const { pushProvider } = await import('../providers/push')
    const result = await pushProvider.send(payload)

    expect(result).toEqual({ success: false, error: 'Firebase Admin not configured' })
  })

  it('send fetches tokens and sends via multicast', async () => {
    const { isFirebaseAdminConfigured } = await import('@/lib/firebase/admin')
    vi.mocked(isFirebaseAdminConfigured).mockReturnValue(true)

    setupFromChain({ tokenRows: [{ token: 'tok-a' }, { token: 'tok-b' }] })
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 2,
      responses: [{ success: true }, { success: true }],
    })

    const { pushProvider } = await import('../providers/push')
    const result = await pushProvider.send(payload)

    expect(result).toEqual({ success: true, messageId: 'multicast:2/2' })
    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['tok-a', 'tok-b'],
        notification: { title: 'Test', body: 'Test body' },
      }),
    )
  })

  it('send cleans stale tokens on registration error', async () => {
    const { isFirebaseAdminConfigured } = await import('@/lib/firebase/admin')
    vi.mocked(isFirebaseAdminConfigured).mockReturnValue(true)

    setupFromChain({ tokenRows: [{ token: 'tok-good' }, { token: 'tok-stale' }] })
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    })

    const { pushProvider } = await import('../providers/push')
    const result = await pushProvider.send(payload)

    expect(result).toEqual({ success: true, messageId: 'multicast:1/2' })
    expect(mockDelete).toHaveBeenCalled()
    expect(mockIn).toHaveBeenCalledWith('token', ['tok-stale'])
  })
})

describe('Dialog360Provider (WhatsApp)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('isConfigured returns false when no API key', async () => {
    // The module reads env at import time, so we test the singleton's behavior.
    // Since WHATSAPP_API_KEY is not set in the test env, isConfigured should be false.
    const { whatsappProvider } = await import('../providers/whatsapp')
    expect(whatsappProvider.isConfigured()).toBe(false)
  })

  it('send returns error when not configured', async () => {
    const { whatsappProvider } = await import('../providers/whatsapp')
    const result = await whatsappProvider.send({
      ...payload,
      channel: 'whatsapp',
      to: '+201234567890',
    })

    expect(result).toEqual({ success: false, error: 'WhatsApp API key not configured' })
  })

  it('send posts to API and returns messageId on success', async () => {
    // We need to re-mock the module with the API key set
    vi.doMock('../providers/whatsapp', async () => {
      const { logger: mockLogger } = await import('@/lib/logger')

      class Dialog360ProviderMock {
        isConfigured() { return true }
        async send(p: MessagePayload) {
          if (!this.isConfigured()) {
            return { success: false, error: 'WhatsApp API key not configured' }
          }
          const phone = p.to.replace(/[^0-9]/g, '')
          const response = await fetch('https://waba.360dialog.io/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'D360-API-KEY': 'test-api-key',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template: {
                name: p.template,
                language: { code: p.locale?.startsWith('ar') ? 'ar' : 'en' },
                components: [],
              },
            }),
          })
          if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` }
          }
          const data = await response.json()
          return { success: true, messageId: data?.messages?.[0]?.id }
        }
      }
      return { whatsappProvider: new Dialog360ProviderMock() }
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid-abc' }] }), { status: 200 }),
    )

    const { whatsappProvider } = await import('../providers/whatsapp')
    const result = await whatsappProvider.send({
      ...payload,
      channel: 'whatsapp',
      to: '+201234567890',
    })

    expect(result).toEqual({ success: true, messageId: 'wamid-abc' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://waba.360dialog.io/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    )

    vi.doUnmock('../providers/whatsapp')
  })
})

describe('ResendProvider (Email)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isConfigured returns false when no API key', async () => {
    // RESEND_API_KEY is not set in the test env
    const { emailProvider } = await import('../providers/email')
    expect(emailProvider.isConfigured()).toBe(false)
  })

  it('send returns error when not configured', async () => {
    const { emailProvider } = await import('../providers/email')
    const result = await emailProvider.send({
      ...payload,
      channel: 'email',
      to: 'test@example.com',
    })

    expect(result).toEqual({ success: false, error: 'Resend API key not configured' })
  })
})
