import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mutable mock state — hoisted so the vi.mock factories can reference it.
const { mockConfig, mockSend } = vi.hoisted(() => ({
  mockConfig: { auth: { sendSmsHookSecret: undefined as string | undefined } },
  mockSend: vi.fn(),
}))

vi.mock('@/lib/config', () => ({ config: mockConfig }))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/whatsapp/otp', () => ({
  sendWhatsAppOtp: (...args: unknown[]) => mockSend(...args),
}))

import { POST } from '../route'

// A valid Standard Webhooks secret in the "v1,whsec_<base64>" form.
const RAW_KEY = Buffer.from('super-secret-key-for-testing-only').toString('base64')
const SECRET = `v1,whsec_${RAW_KEY}`

function sign(secret: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secret.replace('v1,whsec_', ''), 'base64')
  return crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`, 'utf8').digest('base64')
}

function makeRequest(opts: {
  body: string
  id?: string | null
  timestamp?: string | null
  signature?: string | null
}): Request {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (opts.id != null) headers.set('webhook-id', opts.id)
  if (opts.timestamp != null) headers.set('webhook-timestamp', opts.timestamp)
  if (opts.signature != null) headers.set('webhook-signature', opts.signature)
  return new Request('https://app.test/api/auth/sms-hook', {
    method: 'POST',
    headers,
    body: opts.body,
  })
}

const VALID_PAYLOAD = JSON.stringify({
  user: { phone: '+201000000000' },
  sms: { otp: '123456' },
})

describe('POST /api/auth/sms-hook', () => {
  beforeEach(() => {
    mockSend.mockReset().mockResolvedValue(undefined)
    mockConfig.auth.sendSmsHookSecret = SECRET
  })

  it('verifies a valid signature, calls the sender, and returns 200 {}', async () => {
    const id = 'msg_1'
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = `v1,${sign(SECRET, id, ts, VALID_PAYLOAD)}`

    const res = await POST(
      makeRequest({ body: VALID_PAYLOAD, id, timestamp: ts, signature: sig }) as never
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
    expect(mockSend).toHaveBeenCalledWith('+201000000000', '123456')
  })

  it('returns 403 for an invalid signature and does NOT call the sender', async () => {
    const id = 'msg_1'
    const ts = String(Math.floor(Date.now() / 1000))

    const res = await POST(
      makeRequest({
        body: VALID_PAYLOAD,
        id,
        timestamp: ts,
        signature: 'v1,deadbeefdeadbeefdeadbeefdeadbeef',
      }) as never
    )

    expect(res.status).toBe(403)
    expect(mockSend).not.toHaveBeenCalled()
    const json = await res.json()
    expect(json.error.http_code).toBe(403)
  })

  it('returns 403 when signature headers are missing', async () => {
    const res = await POST(makeRequest({ body: VALID_PAYLOAD }) as never)
    expect(res.status).toBe(403)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('fails closed with 403 when the hook secret is not configured', async () => {
    mockConfig.auth.sendSmsHookSecret = undefined
    const id = 'msg_1'
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = `v1,${sign(SECRET, id, ts, VALID_PAYLOAD)}`

    const res = await POST(
      makeRequest({ body: VALID_PAYLOAD, id, timestamp: ts, signature: sig }) as never
    )

    expect(res.status).toBe(403)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('rejects a replayed (stale) timestamp with 403', async () => {
    const id = 'msg_1'
    const staleTs = String(Math.floor(Date.now() / 1000) - 3600) // 1 hour old
    const sig = `v1,${sign(SECRET, id, staleTs, VALID_PAYLOAD)}`

    const res = await POST(
      makeRequest({ body: VALID_PAYLOAD, id, timestamp: staleTs, signature: sig }) as never
    )

    expect(res.status).toBe(403)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns 400 when the payload is missing phone or otp', async () => {
    const body = JSON.stringify({ user: {}, sms: {} })
    const id = 'msg_1'
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = `v1,${sign(SECRET, id, ts, body)}`

    const res = await POST(
      makeRequest({ body, id, timestamp: ts, signature: sig }) as never
    )

    expect(res.status).toBe(400)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns 500 (hook error shape) when delivery fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('cloud api down'))
    const id = 'msg_1'
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = `v1,${sign(SECRET, id, ts, VALID_PAYLOAD)}`

    const res = await POST(
      makeRequest({ body: VALID_PAYLOAD, id, timestamp: ts, signature: sig }) as never
    )

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error.http_code).toBe(500)
  })
})
