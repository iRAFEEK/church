import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

import { verifySendSmsHook, computeSignature } from '../verify-hook'

const RAW_KEY = Buffer.from('a-test-signing-key').toString('base64')
const SECRET = `v1,whsec_${RAW_KEY}`
const BODY = JSON.stringify({ user: { phone: '+201000000000' }, sms: { otp: '424242' } })

function nowTs(): string {
  return String(Math.floor(Date.now() / 1000))
}

describe('verifySendSmsHook', () => {
  it('accepts a correctly signed request', () => {
    const id = 'm1'
    const ts = nowTs()
    const sig = `v1,${computeSignature(SECRET, id, ts, BODY)}`
    const result = verifySendSmsHook({
      secret: SECRET,
      rawBody: BODY,
      headers: { id, timestamp: ts, signature: sig },
    })
    expect(result.valid).toBe(true)
  })

  it('matches the standardwebhooks HMAC algorithm', () => {
    const id = 'm1'
    const ts = nowTs()
    const key = Buffer.from(RAW_KEY, 'base64')
    const expected = crypto
      .createHmac('sha256', key)
      .update(`${id}.${ts}.${BODY}`, 'utf8')
      .digest('base64')
    expect(computeSignature(SECRET, id, ts, BODY)).toBe(expected)
  })

  it('fails closed when the secret is undefined', () => {
    const id = 'm1'
    const ts = nowTs()
    const sig = `v1,${computeSignature(SECRET, id, ts, BODY)}`
    const result = verifySendSmsHook({
      secret: undefined,
      rawBody: BODY,
      headers: { id, timestamp: ts, signature: sig },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects a tampered body', () => {
    const id = 'm1'
    const ts = nowTs()
    const sig = `v1,${computeSignature(SECRET, id, ts, BODY)}`
    const result = verifySendSmsHook({
      secret: SECRET,
      rawBody: BODY + 'tampered',
      headers: { id, timestamp: ts, signature: sig },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects missing headers', () => {
    const result = verifySendSmsHook({
      secret: SECRET,
      rawBody: BODY,
      headers: { id: null, timestamp: null, signature: null },
    })
    expect(result.valid).toBe(false)
  })

  it('rejects a stale timestamp', () => {
    const id = 'm1'
    const ts = String(Math.floor(Date.now() / 1000) - 3600)
    const sig = `v1,${computeSignature(SECRET, id, ts, BODY)}`
    const result = verifySendSmsHook({
      secret: SECRET,
      rawBody: BODY,
      headers: { id, timestamp: ts, signature: sig },
    })
    expect(result.valid).toBe(false)
  })

  it('tolerates a secret supplied without the v1,whsec_ prefix', () => {
    const id = 'm1'
    const ts = nowTs()
    const sig = `v1,${computeSignature(SECRET, id, ts, BODY)}`
    const result = verifySendSmsHook({
      secret: RAW_KEY, // bare base64
      rawBody: BODY,
      headers: { id, timestamp: ts, signature: sig },
    })
    expect(result.valid).toBe(true)
  })
})
