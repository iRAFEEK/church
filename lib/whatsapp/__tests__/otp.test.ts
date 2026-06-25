import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mutable config the sender reads. Tests flip credentials before each case.
// Defined via vi.hoisted so the hoisted vi.mock factories can reference it.
const { mockConfig, mockLoggerInfo, mockLoggerError } = vi.hoisted(() => ({
  mockConfig: {
    whatsapp: {
      otpPhoneNumberId: undefined as string | undefined,
      otpAccessToken: undefined as string | undefined,
      otpTemplate: 'otp_login',
    },
    app: { env: 'test' as 'development' | 'test' | 'production' },
  },
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
}))

vi.mock('@/lib/config', () => ({
  config: mockConfig,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: vi.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
    debug: vi.fn(),
  },
}))

import { sendWhatsAppOtp, buildOtpTemplatePayload } from '../otp'

describe('sendWhatsAppOtp', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockLoggerInfo.mockClear()
    mockLoggerError.mockClear()
    mockConfig.whatsapp.otpPhoneNumberId = undefined
    mockConfig.whatsapp.otpAccessToken = undefined
    mockConfig.whatsapp.otpTemplate = 'otp_login'
    mockConfig.app.env = 'test'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('dev mode (no credentials)', () => {
    it('logs the OTP and returns without calling fetch', async () => {
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)

      await sendWhatsAppOtp('+201000000000', '123456')

      expect(fetchSpy).not.toHaveBeenCalled()
      expect(mockLoggerInfo).toHaveBeenCalledTimes(1)
      const [, ctx] = mockLoggerInfo.mock.calls[0]
      // OTP is surfaced in dev; phone is masked to last 3 digits (PII minimization).
      expect(ctx).toMatchObject({ module: 'whatsapp-otp', otp: '123456', phone: '***000' })
    })

    it('SEC-1: in production with no credentials, throws and never logs the OTP', async () => {
      mockConfig.app.env = 'production'
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)

      await expect(sendWhatsAppOtp('+201000000000', '123456')).rejects.toThrow()
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(JSON.stringify(mockLoggerInfo.mock.calls)).not.toContain('123456')
    })
  })

  describe('production mode (credentials set)', () => {
    beforeEach(() => {
      mockConfig.whatsapp.otpPhoneNumberId = '1234567890'
      mockConfig.whatsapp.otpAccessToken = 'EAAtoken'
    })

    it('POSTs the correct Cloud API request body and headers', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', fetchSpy)

      await sendWhatsAppOtp('+20 100 000 0000', '654321', { locale: 'en' })

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url).toBe('https://graph.facebook.com/v21.0/1234567890/messages')
      expect(init.method).toBe('POST')
      expect(init.headers.Authorization).toBe('Bearer EAAtoken')
      expect(init.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(init.body)
      expect(body.messaging_product).toBe('whatsapp')
      expect(body.to).toBe('201000000000') // digits only, no "+"
      expect(body.type).toBe('template')
      expect(body.template.name).toBe('otp_login')
      expect(body.template.language.code).toBe('en')
      // OTP in BOTH body and the copy-code URL button
      expect(body.template.components[0]).toEqual({
        type: 'body',
        parameters: [{ type: 'text', text: '654321' }],
      })
      expect(body.template.components[1]).toEqual({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: '654321' }],
      })
    })

    it('defaults the template language to ar when locale is absent', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', fetchSpy)

      await sendWhatsAppOtp('+201000000000', '111222')

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.template.language.code).toBe('ar')
    })

    it('never logs the OTP in production mode', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 })
      vi.stubGlobal('fetch', fetchSpy)

      await sendWhatsAppOtp('+201000000000', 'SECRET', {})

      const allLoggedArgs = JSON.stringify(mockLoggerInfo.mock.calls)
      expect(allLoggedArgs).not.toContain('SECRET')
    })

    it('throws on a non-2xx Cloud API response', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"error":"bad token"}'),
      })
      vi.stubGlobal('fetch', fetchSpy)

      await expect(sendWhatsAppOtp('+201000000000', '999000')).rejects.toThrow(
        'WhatsApp Cloud API responded 401'
      )
      expect(mockLoggerError).toHaveBeenCalled()
    })

    it('throws on a network error', async () => {
      const fetchSpy = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
      vi.stubGlobal('fetch', fetchSpy)

      await expect(sendWhatsAppOtp('+201000000000', '999000')).rejects.toThrow('ECONNRESET')
      expect(mockLoggerError).toHaveBeenCalled()
    })
  })
})

describe('buildOtpTemplatePayload', () => {
  beforeEach(() => {
    mockConfig.whatsapp.otpTemplate = 'otp_login'
  })

  it('uses an explicit template name when provided', () => {
    const body = buildOtpTemplatePayload('+201000000000', '000111', {
      template: 'custom_tmpl',
      locale: 'ar',
    })
    expect(body.template.name).toBe('custom_tmpl')
    expect(body.template.language.code).toBe('ar')
  })
})
