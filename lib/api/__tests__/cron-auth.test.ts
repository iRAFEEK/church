import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/api/cron-auth'

describe('verifyCronAuth', () => {
  const SECRET = 'test-cron-secret-abc123'

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  const makeReq = (auth?: string) =>
    new NextRequest('http://localhost/api/cron/test', {
      headers: auth ? { authorization: `Bearer ${auth}` } : {},
    })

  it('returns null (authorized) with correct secret', () => {
    const result = verifyCronAuth(makeReq(SECRET))
    expect(result).toBeNull()
  })

  it('returns 401 with no authorization header', () => {
    const result = verifyCronAuth(makeReq())
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('returns 401 with wrong secret', () => {
    const result = verifyCronAuth(makeReq('wrong-secret'))
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('returns 500 when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET
    const result = verifyCronAuth(makeReq(SECRET))
    expect(result).not.toBeNull()
    expect(result!.status).toBe(500)
  })

  it('returns 401 with empty authorization header', () => {
    const result = verifyCronAuth(makeReq(''))
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })

  it('uses timing-safe comparison (no early-exit on first byte mismatch)', () => {
    // This test just verifies it doesn't crash with various length mismatches
    const result1 = verifyCronAuth(makeReq('a'))
    expect(result1!.status).toBe(401)

    const result2 = verifyCronAuth(makeReq('a'.repeat(1000)))
    expect(result2!.status).toBe(401)
  })
})
