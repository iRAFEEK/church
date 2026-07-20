import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { MessagePayload, MessageResult } from '@/lib/messaging/types'

/**
 * Domain health cron tests.
 *
 * The failure this monitor exists for (Vercel losing the TLS cert binding) shows up
 * as fetch THROWING, not as a bad status — so the "fetch rejects" case is the
 * headline test here, and it must assert the alert path is attempted.
 */

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockSend = vi.fn<(payload: MessagePayload) => Promise<MessageResult>>()
const mockIsConfigured = vi.fn<() => boolean>()

// Lazy wrappers: vi.mock is hoisted above the consts above, so the factory must not
// dereference them at module-eval time.
vi.mock('@/lib/messaging/providers/email', () => ({
  emailProvider: {
    send: (payload: MessagePayload) => mockSend(payload),
    isConfigured: () => mockIsConfigured(),
  },
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

const SECRET = 'cron-test-secret-xyz'

/** Mirrors FETCH_TIMEOUT_MS in the route. */
const FETCH_TIMEOUT_MS = 10_000

const makeReq = (auth?: string) =>
  new NextRequest('http://localhost/api/cron/domain-health', {
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
  })

const okResponse = () => new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })

const loadRoute = async () => (await import('@/app/api/cron/domain-health/route')).GET

const spyOnFetch = () => vi.spyOn(globalThis, 'fetch')

// ── Tests ───────────────────────────────────────────────────────────────────

describe('/api/cron/domain-health', () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>

  // vi.stubEnv + unstubAllEnvs so each test is order-independent: plain `delete`
  // would leave a test that relies on an env var being ABSENT passing only by
  // accident of what the previous test cleaned up.
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', SECRET)
    vi.stubEnv('HEALTH_CHECK_URL', 'https://www.miaekklesia.com')
    vi.stubEnv('ALERT_EMAIL', 'alerts@example.test')
    vi.stubEnv('PLATFORM_ADMIN_EMAILS', '')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    mockIsConfigured.mockReturnValue(true)
    mockSend.mockResolvedValue({ success: true, messageId: 'msg_1' })
    fetchSpy = spyOnFetch()
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  describe('auth guard', () => {
    it('returns 401 without auth header', async () => {
      const GET = await loadRoute()
      const res = await GET(makeReq())
      expect(res.status).toBe(401)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('returns 401 with wrong secret', async () => {
      const GET = await loadRoute()
      const res = await GET(makeReq('wrong-secret-value'))
      expect(res.status).toBe(401)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('fails closed with 500 when CRON_SECRET is not configured', async () => {
      vi.stubEnv('CRON_SECRET', '')

      const GET = await loadRoute()
      const res = await GET(makeReq(SECRET))

      expect(res.status).toBe(500)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('probe target resolution', () => {
    it('strips a trailing slash before appending /api/health', async () => {
      vi.stubEnv('HEALTH_CHECK_URL', 'https://www.miaekklesia.com/')
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      expect(String(fetchSpy.mock.calls[0][0])).toBe('https://www.miaekklesia.com/api/health')
    })

    it('falls back to NEXT_PUBLIC_APP_URL when HEALTH_CHECK_URL is unset', async () => {
      vi.stubEnv('HEALTH_CHECK_URL', '')
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://staging.example.test')
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      expect(String(fetchSpy.mock.calls[0][0])).toBe('https://staging.example.test/api/health')
    })

    it('falls back to the production default when no URL env is set', async () => {
      vi.stubEnv('HEALTH_CHECK_URL', '')
      vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      expect(String(fetchSpy.mock.calls[0][0])).toBe('https://www.miaekklesia.com/api/health')
    })

    // REGRESSION GUARD: an http:// probe returns 200 straight through a TLS outage,
    // which would make this monitor report green during the exact incident it exists
    // to catch. NEXT_PUBLIC_APP_URL is http://localhost:3000 in local envs.
    it('refuses a non-HTTPS target and uses the production default instead', async () => {
      vi.stubEnv('HEALTH_CHECK_URL', '')
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      const probed = fetchSpy.mock.calls.map((c) => String(c[0]))
      expect(probed[0]).toBe('https://www.miaekklesia.com/api/health')
      expect(probed.every((u) => u.startsWith('https://'))).toBe(true)
    })

    it('derives the apex from the probe target rather than hardcoding production', async () => {
      vi.stubEnv('HEALTH_CHECK_URL', 'https://www.staging.example.test')
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      const probed = fetchSpy.mock.calls.map((c) => String(c[0]))
      expect(probed).toContain('https://staging.example.test')
      expect(probed.some((u) => u.includes('miaekklesia.com'))).toBe(false)
    })
  })

  describe('UP', () => {
    it('reports ok:true when the health URL resolves 200, and sends no alert', async () => {
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      const res = await GET(makeReq(SECRET))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.status).toBe(200)
      expect(body.url).toBe('https://www.miaekklesia.com/api/health')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('probes the /api/health path with no-store and an abort signal', async () => {
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      const [url, init] = fetchSpy.mock.calls[0]
      expect(String(url)).toBe('https://www.miaekklesia.com/api/health')
      expect(init?.cache).toBe('no-store')
      expect(init?.redirect).toBe('follow')
      expect(init?.signal).toBeDefined()
    })
  })

  describe('DOWN — fetch rejects (TLS cert failure)', () => {
    it('reports ok:false and attempts the alert email', async () => {
      fetchSpy.mockRejectedValue(new Error('no peer certificate available'))

      const GET = await loadRoute()
      const res = await GET(makeReq(SECRET))
      const body = await res.json()

      expect(res.status).toBe(200) // cron itself succeeded
      expect(body.ok).toBe(false)
      expect(body.status).toBeNull()
      expect(body.error).toContain('no peer certificate available')
      expect(body.alerted).toBe(true)

      expect(mockSend).toHaveBeenCalledTimes(1)
      const payload = mockSend.mock.calls[0][0]
      expect(payload.to).toBe('alerts@example.test')
      expect(payload.channel).toBe('email')
      expect(payload.params.subject).toContain('DOWN')
      expect(payload.params.body).toContain('no peer certificate available')
      expect(payload.params.body).toContain('vercel certs issue')
    })

    it('falls back to the first PLATFORM_ADMIN_EMAILS address when ALERT_EMAIL is unset', async () => {
      delete process.env.ALERT_EMAIL
      process.env.PLATFORM_ADMIN_EMAILS = 'owner@example.test, second@example.test'
      fetchSpy.mockRejectedValue(new Error('no peer certificate available'))

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      expect(mockSend.mock.calls[0][0].to).toBe('owner@example.test')
    })

    it('degrades gracefully when email is unconfigured — no throw, alerted:false', async () => {
      mockIsConfigured.mockReturnValue(false)
      fetchSpy.mockRejectedValue(new Error('no peer certificate available'))

      const GET = await loadRoute()
      const res = await GET(makeReq(SECRET))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(false)
      expect(body.alerted).toBe(false)
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('degrades gracefully when no recipient is configured', async () => {
      delete process.env.ALERT_EMAIL
      fetchSpy.mockRejectedValue(new Error('no peer certificate available'))

      const GET = await loadRoute()
      const res = await GET(makeReq(SECRET))
      const body = await res.json()

      expect(body.ok).toBe(false)
      expect(body.alerted).toBe(false)
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('reports alerted:false when Resend returns an error result (not a throw)', async () => {
      fetchSpy.mockRejectedValue(new Error('no peer certificate available'))
      mockSend.mockResolvedValue({ success: false, error: 'domain not verified' })

      const GET = await loadRoute()
      const body = await (await GET(makeReq(SECRET))).json()

      expect(body.ok).toBe(false)
      expect(body.alerted).toBe(false)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('does not throw when the alert email provider itself rejects', async () => {
      fetchSpy.mockRejectedValue(new Error('no peer certificate available'))
      mockSend.mockRejectedValue(new Error('resend exploded'))

      const GET = await loadRoute()
      const res = await GET(makeReq(SECRET))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(false)
      expect(body.alerted).toBe(false)
    })
  })

  describe('DOWN — non-2xx status', () => {
    it('treats 503 as DOWN and alerts', async () => {
      fetchSpy.mockResolvedValue(new Response('unhealthy', { status: 503 }))

      const GET = await loadRoute()
      const res = await GET(makeReq(SECRET))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(false)
      expect(body.status).toBe(503)
      expect(body.alerted).toBe(true)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('treats 500 as DOWN', async () => {
      fetchSpy.mockResolvedValue(new Response('boom', { status: 500 }))

      const GET = await loadRoute()
      const body = await (await GET(makeReq(SECRET))).json()

      expect(body.ok).toBe(false)
      expect(body.status).toBe(500)
    })
  })

  describe('timeout', () => {
    // The realistic shape of the TLS outage is a handshake that hangs rather than
    // one that fails fast, so the abort path must produce a DOWN + an alert.
    it('aborts a hung request and reports it as a labelled timeout', async () => {
      fetchSpy.mockImplementation((_input, init?: RequestInit) => {
        // Never settles on its own — only the route's AbortController can end it.
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('This operation was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })

      // Resolve the dynamic import BEFORE faking timers, then fake them so the
      // route's 10s timer fires virtually — the test must not actually wait 10s.
      const GET = await loadRoute()
      vi.useFakeTimers()

      const resPromise = GET(makeReq(SECRET))
      await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS)
      vi.useRealTimers()

      const body = await (await resPromise).json()

      expect(body.ok).toBe(false)
      expect(body.status).toBeNull()
      expect(body.error).toContain('Timed out')
      expect(body.alerted).toBe(true)
    })
  })

  describe('apex probe', () => {
    it('probes both the health path and the derived apex', async () => {
      fetchSpy.mockResolvedValue(okResponse())

      const GET = await loadRoute()
      await GET(makeReq(SECRET))

      const probed = fetchSpy.mock.calls.map((c) => String(c[0]))
      expect(probed).toHaveLength(2)
      expect(probed).toContain('https://www.miaekklesia.com/api/health')
      expect(probed).toContain('https://miaekklesia.com')
    })

    // www healthy + apex broken: reported, but does NOT flip the overall verdict.
    it('reports an apex failure without marking the site DOWN', async () => {
      fetchSpy.mockImplementation((input) => {
        return String(input).includes('/api/health')
          ? Promise.resolve(okResponse())
          : Promise.reject(new Error('no peer certificate available'))
      })

      const GET = await loadRoute()
      const body = await (await GET(makeReq(SECRET))).json()

      expect(body.ok).toBe(true)
      expect(body.apex.ok).toBe(false)
      expect(mockSend).not.toHaveBeenCalled()
    })
  })
})
