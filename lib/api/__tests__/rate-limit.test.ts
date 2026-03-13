import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Helpers ──────────────────────────────────────────────────────────────────

let counter = 0
/** Generate a unique IP per call so tests never collide on the shared store. */
function uniqueIp(): string {
  counter++
  return `10.0.${Math.floor(counter / 256)}.${counter % 256}`
}

const makeReq = (ip?: string, headers?: Record<string, string>) =>
  new NextRequest('http://localhost/api/test', {
    headers: { ...(ip ? { 'x-forwarded-for': ip } : {}), ...headers },
  })

// ── Tests ────────────────────────────────────────────────────────────────────

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('allows the first request (returns null)', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()
      const result = checkRateLimit(makeReq(ip), { limit: 5, windowSeconds: 60 })
      expect(result).toBeNull()
    })

    it('allows requests up to the limit', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()
      const opts = { limit: 5, windowSeconds: 60 }

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(makeReq(ip), opts)
        expect(result).toBeNull()
      }
    })

    it('returns 429 after exceeding the limit', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()
      const opts = { limit: 3, windowSeconds: 60 }

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(makeReq(ip), opts)
      }

      const result = checkRateLimit(makeReq(ip), opts)
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)

      const body = await result!.json()
      expect(body.error).toBe('Too many requests. Please try again later.')
    })

    it('includes correct rate-limit headers on 429 response', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()
      const opts = { limit: 2, windowSeconds: 120 }

      checkRateLimit(makeReq(ip), opts)
      checkRateLimit(makeReq(ip), opts)
      const result = checkRateLimit(makeReq(ip), opts)

      expect(result).not.toBeNull()
      expect(result!.headers.get('Retry-After')).toBeTruthy()
      expect(Number(result!.headers.get('Retry-After'))).toBeGreaterThan(0)
      expect(Number(result!.headers.get('Retry-After'))).toBeLessThanOrEqual(120)
      expect(result!.headers.get('X-RateLimit-Limit')).toBe('2')
      expect(result!.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(result!.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    it('starts a new window after the previous one expires', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()
      const opts = { limit: 2, windowSeconds: 60 }

      checkRateLimit(makeReq(ip), opts)
      checkRateLimit(makeReq(ip), opts)

      // Exceed limit
      const blocked = checkRateLimit(makeReq(ip), opts)
      expect(blocked).not.toBeNull()
      expect(blocked!.status).toBe(429)

      // Advance past the window
      vi.advanceTimersByTime(61_000)

      // Should be allowed again
      const afterExpiry = checkRateLimit(makeReq(ip), opts)
      expect(afterExpiry).toBeNull()
    })

    it('tracks different IP addresses independently', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ipA = uniqueIp()
      const ipB = uniqueIp()
      const opts = { limit: 1, windowSeconds: 60 }

      // Exhaust limit for ipA
      checkRateLimit(makeReq(ipA), opts)
      const blockedA = checkRateLimit(makeReq(ipA), opts)
      expect(blockedA).not.toBeNull()
      expect(blockedA!.status).toBe(429)

      // ipB should still be allowed
      const resultB = checkRateLimit(makeReq(ipB), opts)
      expect(resultB).toBeNull()
    })

    it('isolates counts by prefix', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()

      // Exhaust limit on prefix "a"
      checkRateLimit(makeReq(ip), { limit: 1, windowSeconds: 60, prefix: 'a' })
      const blockedA = checkRateLimit(makeReq(ip), { limit: 1, windowSeconds: 60, prefix: 'a' })
      expect(blockedA).not.toBeNull()
      expect(blockedA!.status).toBe(429)

      // Prefix "b" should still be allowed for the same IP
      const resultB = checkRateLimit(makeReq(ip), { limit: 1, windowSeconds: 60, prefix: 'b' })
      expect(resultB).toBeNull()
    })
  })

  describe('getClientId (via checkRateLimit)', () => {
    it('reads x-forwarded-for first IP from comma-separated list', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const realIp = uniqueIp()
      const proxyIp = uniqueIp()
      const opts = { limit: 1, windowSeconds: 60 }

      // Send with multi-value x-forwarded-for
      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': `${realIp}, ${proxyIp}` },
      })
      checkRateLimit(req, opts)

      // Second request from the same first IP should be blocked
      const req2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': `${realIp}, other` },
      })
      const result = checkRateLimit(req2, opts)
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })

    it('falls back to x-real-ip when x-forwarded-for is missing', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()
      const opts = { limit: 1, windowSeconds: 60 }

      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': ip },
      })
      checkRateLimit(req, opts)

      // Same x-real-ip should share the counter
      const req2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': ip },
      })
      const result = checkRateLimit(req2, opts)
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })

    it('falls back to "unknown" when no IP headers present', async () => {
      const { checkRateLimit } = await import('@/lib/api/rate-limit')
      // Use a unique prefix so the shared "unknown" key doesn't collide across tests
      const prefix = `unk-${counter++}`
      const opts = { limit: 1, windowSeconds: 60, prefix }

      const req1 = new NextRequest('http://localhost/api/test')
      checkRateLimit(req1, opts)

      const req2 = new NextRequest('http://localhost/api/test')
      const result = checkRateLimit(req2, opts)
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })
  })

  describe('preset helpers', () => {
    it('rateLimitPublic allows 20 requests then blocks', async () => {
      const { rateLimitPublic } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()

      for (let i = 0; i < 20; i++) {
        expect(rateLimitPublic(makeReq(ip))).toBeNull()
      }
      const result = rateLimitPublic(makeReq(ip))
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })

    it('rateLimitSensitive allows 5 requests then blocks', async () => {
      const { rateLimitSensitive } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()

      for (let i = 0; i < 5; i++) {
        expect(rateLimitSensitive(makeReq(ip))).toBeNull()
      }
      const result = rateLimitSensitive(makeReq(ip))
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })

    it('rateLimitMutation allows 30 requests then blocks', async () => {
      const { rateLimitMutation } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()

      for (let i = 0; i < 30; i++) {
        expect(rateLimitMutation(makeReq(ip))).toBeNull()
      }
      const result = rateLimitMutation(makeReq(ip))
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })

    it('rateLimitNotify allows 10 requests then blocks', async () => {
      const { rateLimitNotify } = await import('@/lib/api/rate-limit')
      const ip = uniqueIp()

      for (let i = 0; i < 10; i++) {
        expect(rateLimitNotify(makeReq(ip))).toBeNull()
      }
      const result = rateLimitNotify(makeReq(ip))
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })
  })
})
