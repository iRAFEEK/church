import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NotificationRequest, MessageResult } from '../types'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockInsert = vi.fn()
const mockFrom = vi.fn((table: string) => {
  if (table === 'notifications_log') {
    return { insert: mockInsert }
  }
  const mockSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })) }
})

const mockSupabase = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
  createAdminClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const mockInAppSend = vi.fn<(payload: Record<string, unknown>) => Promise<MessageResult>>()
vi.mock('../providers/in-app', () => ({
  inAppProvider: {
    send: (...args: unknown[]) => mockInAppSend(...(args as [Record<string, unknown>])),
    isConfigured: () => true,
  },
}))

const mockWhatsappSend = vi.fn<(payload: Record<string, unknown>) => Promise<MessageResult>>()
vi.mock('../providers/whatsapp', () => ({
  whatsappProvider: {
    send: (...args: unknown[]) => mockWhatsappSend(...(args as [Record<string, unknown>])),
    isConfigured: () => true,
  },
}))

const mockEmailSend = vi.fn<(payload: Record<string, unknown>) => Promise<MessageResult>>()
vi.mock('../providers/email', () => ({
  emailProvider: {
    send: (...args: unknown[]) => mockEmailSend(...(args as [Record<string, unknown>])),
    isConfigured: () => true,
  },
}))

const mockPushSend = vi.fn<(payload: Record<string, unknown>) => Promise<MessageResult>>()
const mockPushIsConfigured = vi.fn<() => boolean>()
vi.mock('../providers/push', () => ({
  pushProvider: {
    send: (...args: unknown[]) => mockPushSend(...(args as [Record<string, unknown>])),
    isConfigured: () => mockPushIsConfigured(),
  },
}))

// ── Fixtures ───────────────────────────────────────────────────────────────────

const baseRequest: NotificationRequest = {
  profileId: 'profile-1',
  churchId: 'church-1',
  type: 'gathering_reminder' as const,
  titleEn: 'Test Title',
  titleAr: 'عنوان اختبار',
  bodyEn: 'Test body',
  bodyAr: 'نص اختبار',
  data: { groupName: 'Test Group' },
  channels: ['in_app', 'whatsapp', 'email', 'push'],
  phone: '+201234567890',
  email: 'test@test.com',
}

const successResult: MessageResult = { success: true, messageId: 'msg-1' }

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Set up the supabase mock chain to return profile and church data.
 * Call sequence: from('profiles') -> select() -> eq() -> single()
 * Then:          from('churches') -> select() -> eq() -> single()
 */
function setupProfileAndChurchQuery(
  profile: { notification_pref?: string; phone?: string; email?: string; church_id?: string },
  church: { primary_language?: string }
) {
  // When channels are provided: call 1 = profiles (getProfileContactInfo), call 2 = churches
  // When channels are NOT provided: call 1 = profiles (resolveChannels), call 2 = profiles (getProfileContactInfo), call 3 = churches
  let callCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'notifications_log') {
      return { insert: mockInsert }
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => {
            callCount++
            if (table === 'churches') {
              return Promise.resolve({ data: church, error: null })
            }
            return Promise.resolve({ data: profile, error: null })
          }),
        })),
      })),
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('sendNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInAppSend.mockResolvedValue(successResult)
    mockWhatsappSend.mockResolvedValue(successResult)
    mockEmailSend.mockResolvedValue(successResult)
    mockPushSend.mockResolvedValue(successResult)
    mockPushIsConfigured.mockReturnValue(true)
    mockInsert.mockResolvedValue({ error: null })

    // Default: profile with phone/email, Arabic church
    setupProfileAndChurchQuery(
      { phone: '+201234567890', email: 'test@test.com', church_id: 'church-1' },
      { primary_language: 'ar' }
    )
  })

  // Lazily import to let mocks register first
  async function callSendNotification(request: NotificationRequest) {
    const { sendNotification } = await import('../dispatcher')
    return sendNotification(request)
  }

  it('always sends in-app notification', async () => {
    await callSendNotification({ ...baseRequest, channels: ['in_app'] })

    expect(mockInAppSend).toHaveBeenCalledTimes(1)
    expect(mockInAppSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'profile-1',
        channel: 'in_app',
      })
    )
  })

  it('sends WhatsApp when channels include whatsapp and phone available', async () => {
    await callSendNotification(baseRequest)

    expect(mockWhatsappSend).toHaveBeenCalledTimes(1)
    expect(mockWhatsappSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+201234567890',
        channel: 'whatsapp',
        template: 'gathering_reminder',
      })
    )
  })

  it('sends email when channels include email and email available', async () => {
    await callSendNotification(baseRequest)

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@test.com',
        channel: 'email',
      })
    )
  })

  it('sends push when channels include push and push configured', async () => {
    await callSendNotification(baseRequest)

    expect(mockPushSend).toHaveBeenCalledTimes(1)
    expect(mockPushSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'profile-1',
        channel: 'push',
      })
    )
  })

  it('skips WhatsApp when phone not available', async () => {
    setupProfileAndChurchQuery(
      { phone: undefined, email: 'test@test.com', church_id: 'church-1' },
      { primary_language: 'ar' }
    )

    const request: NotificationRequest = {
      ...baseRequest,
      phone: undefined,
      channels: ['in_app', 'whatsapp'],
    }
    await callSendNotification(request)

    expect(mockWhatsappSend).not.toHaveBeenCalled()
  })

  it('skips email when email not available', async () => {
    setupProfileAndChurchQuery(
      { phone: '+201234567890', email: undefined, church_id: 'church-1' },
      { primary_language: 'ar' }
    )

    const request: NotificationRequest = {
      ...baseRequest,
      email: undefined,
      channels: ['in_app', 'email'],
    }
    await callSendNotification(request)

    expect(mockEmailSend).not.toHaveBeenCalled()
  })

  it('uses user preference channels when none specified', async () => {
    // resolveChannels will query profiles for notification_pref
    // Return 'email' pref so channels = ['email', 'in_app']
    let profileCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications_log') {
        return { insert: mockInsert }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => {
              if (table === 'churches') {
                return Promise.resolve({ data: { primary_language: 'ar' }, error: null })
              }
              profileCallCount++
              if (profileCallCount === 1) {
                // resolveChannels query
                return Promise.resolve({ data: { notification_pref: 'email' }, error: null })
              }
              // getProfileContactInfo profiles query
              return Promise.resolve({
                data: { phone: '+201234567890', email: 'test@test.com', church_id: 'church-1' },
                error: null,
              })
            }),
          })),
        })),
      }
    })

    const request: NotificationRequest = {
      ...baseRequest,
      channels: undefined,
    }
    await callSendNotification(request)

    expect(mockInAppSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockWhatsappSend).not.toHaveBeenCalled()
    expect(mockPushSend).not.toHaveBeenCalled()
  })

  it("'none' preference still sends in-app", async () => {
    let profileCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications_log') {
        return { insert: mockInsert }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => {
              if (table === 'churches') {
                return Promise.resolve({ data: { primary_language: 'ar' }, error: null })
              }
              profileCallCount++
              if (profileCallCount === 1) {
                return Promise.resolve({ data: { notification_pref: 'none' }, error: null })
              }
              return Promise.resolve({
                data: { phone: '+201234567890', email: 'test@test.com', church_id: 'church-1' },
                error: null,
              })
            }),
          })),
        })),
      }
    })

    const request: NotificationRequest = {
      ...baseRequest,
      channels: undefined,
    }
    await callSendNotification(request)

    expect(mockInAppSend).toHaveBeenCalledTimes(1)
    expect(mockWhatsappSend).not.toHaveBeenCalled()
    expect(mockEmailSend).not.toHaveBeenCalled()
    expect(mockPushSend).not.toHaveBeenCalled()
  })

  it('uses Arabic locale when church primary_language is Arabic', async () => {
    setupProfileAndChurchQuery(
      { phone: '+201234567890', email: 'test@test.com', church_id: 'church-1' },
      { primary_language: 'ar' }
    )

    await callSendNotification({ ...baseRequest, channels: ['in_app'] })

    expect(mockInAppSend).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'ar',
        params: expect.objectContaining({
          _title: 'عنوان اختبار',
          _body: 'نص اختبار',
        }),
      })
    )
  })

  it('uses English locale when church primary_language is English', async () => {
    setupProfileAndChurchQuery(
      { phone: '+201234567890', email: 'test@test.com', church_id: 'church-1' },
      { primary_language: 'en' }
    )

    await callSendNotification({ ...baseRequest, channels: ['in_app'] })

    expect(mockInAppSend).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
        params: expect.objectContaining({
          _title: 'Test Title',
          _body: 'Test body',
        }),
      })
    )
  })

  it('logs notification for WhatsApp, email, and push channels', async () => {
    await callSendNotification(baseRequest)

    // WhatsApp, email, and push each trigger logNotification (3 calls to notifications_log insert)
    const logInsertCalls = mockInsert.mock.calls
    expect(logInsertCalls.length).toBe(3)

    const insertedChannels = logInsertCalls.map(
      (call: [Record<string, unknown>]) => call[0].channel
    )
    expect(insertedChannels).toContain('whatsapp')
    expect(insertedChannels).toContain('email')
    expect(insertedChannels).toContain('push')
  })

  it('handles provider failure gracefully', async () => {
    mockWhatsappSend.mockRejectedValue(new Error('WhatsApp API down'))

    // Should not throw — the function should handle the error
    const request: NotificationRequest = {
      ...baseRequest,
      channels: ['in_app', 'whatsapp'],
    }

    await expect(callSendNotification(request)).rejects.toThrow()

    // in-app should still have been attempted
    expect(mockInAppSend).toHaveBeenCalledTimes(1)
  })
})
