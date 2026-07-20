import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/api/cron-auth'
import { emailProvider } from '@/lib/messaging/providers/email'
import { logger } from '@/lib/logger'

/**
 * Domain health check cron (hourly).
 *
 * WHY THIS EXISTS: production (miaekklesia.com) went down when Vercel's edge lost
 * the TLS certificate binding for the custom domain. HTTP still answered, but every
 * HTTPS request died at the TLS handshake with "no peer certificate available".
 * Nothing in-app noticed — a human eventually did. This cron closes that gap.
 *
 * A TLS handshake failure makes `fetch` THROW rather than return a response, so the
 * catch block below is the primary signal we care about, not an edge case.
 *
 * This route touches NO database and NO church data — it is a pure external HTTP
 * check. Do not add Supabase calls or church_id logic here.
 *
 * RESPONSE CONTRACT: always HTTP 200 with a JSON body. The `ok` field carries the
 * health verdict; the 200 means "the cron itself ran successfully". A non-200 here
 * would make Vercel mark the cron invocation as failed and retry it, producing extra
 * alert emails within the same hour that tell us nothing new.
 *
 * ALERTS ARE NOT DEDUPED: a sustained outage emails once per hour until it is fixed.
 * That is accepted deliberately — deduping needs persisted state, and this route is
 * intentionally DB-free so that it keeps working when the database is part of the
 * problem. A repeating hourly alert is the correct behaviour for an ongoing outage.
 */

// Give the function room to finish the probe AND still send the alert email. A hung
// TLS handshake burns the full timeout before Resend is even called, so the budget
// must comfortably exceed FETCH_TIMEOUT_MS — otherwise the outage this cron exists
// to report is exactly the case where the alert never gets sent.
export const maxDuration = 30

const FETCH_TIMEOUT_MS = 10_000
const DEFAULT_URL = 'https://www.miaekklesia.com'

const REMEDIATION =
  "If HTTP works but HTTPS fails with 'no peer certificate available', run: " +
  '`vercel certs issue miaekklesia.com www.miaekklesia.com` and wait ~5 minutes. ' +
  "Do not run it repeatedly (Let's Encrypt rate limits)."

interface ProbeResult {
  url: string
  ok: boolean
  status: number | null
  error: string | null
}

/**
 * Resolve the canonical base URL to probe. Every env read is guarded.
 *
 * MUST be HTTPS. The failure mode this cron detects is "HTTP answers fine while the
 * TLS handshake dies", so probing an `http://` URL would return 200 straight through
 * the outage and report green forever. `NEXT_PUBLIC_APP_URL` is `http://localhost:3000`
 * in local envs and ships blank, so the fallback chain can absolutely land there —
 * we refuse a non-HTTPS target and fall back to the known production domain instead.
 */
function resolveBaseUrl(): string {
  const raw = process.env.HEALTH_CHECK_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_URL
  // Strip a trailing slash so we can append the health path cleanly.
  const trimmed = raw.replace(/\/+$/, '')

  if (!trimmed.startsWith('https://')) {
    logger.warn('[CRON] domain health: ignoring non-HTTPS probe target', {
      module: 'cron',
      route: '/api/cron/domain-health',
      rejected: trimmed,
      using: DEFAULT_URL,
    })
    return DEFAULT_URL
  }
  return trimmed
}

/**
 * Derive the apex URL from the probe target (www.example.com → example.com).
 * Informational only — catches "www is fine but the apex cert/redirect broke".
 * Derived rather than hardcoded so a staging/preview run never reaches out and
 * probes the live production domain.
 */
function resolveApexUrl(baseUrl: string): string {
  return baseUrl.replace('://www.', '://')
}

/** Resolve the alert recipient: ALERT_EMAIL, else the first PLATFORM_ADMIN_EMAILS entry. */
function resolveAlertRecipient(): string | null {
  const direct = process.env.ALERT_EMAIL?.trim()
  if (direct) return direct

  const first = process.env.PLATFORM_ADMIN_EMAILS?.split(',')[0]?.trim()
  return first || null
}

/**
 * Probe a single URL. Never throws — a thrown fetch (TLS failure, DNS failure,
 * timeout) is exactly the condition we are monitoring for, so it is caught and
 * reported as DOWN rather than propagated.
 */
async function probe(url: string): Promise<ProbeResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    })
    // We only care about the status, but an unread body holds the socket open
    // until GC. Release it explicitly.
    void res.body?.cancel().catch(() => {})
    return {
      url,
      ok: res.ok, // 2xx only
      status: res.status,
      error: res.ok ? null : `Unexpected status ${res.status}`,
    }
  } catch (err) {
    // A timeout surfaces as a bare "This operation was aborted", which reads like a
    // generic failure in the alert email. Name it — a hung TLS handshake is the
    // most likely shape of the outage we are watching for.
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    return {
      url,
      ok: false,
      status: null,
      error: isTimeout
        ? `Timed out after ${FETCH_TIMEOUT_MS}ms (no response — possible TLS handshake failure)`
        : err instanceof Error
          ? err.message
          : String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Send the DOWN alert email.
 *
 * DEGRADES GRACEFULLY: if Resend is unconfigured or no recipient is set, this logs
 * an error (so the failure still surfaces in Vercel logs / Sentry) and returns
 * false. It never throws — a missing alert channel must not mask the outage itself.
 */
async function sendDownAlert(result: ProbeResult, checkedAt: string): Promise<boolean> {
  const to = resolveAlertRecipient()

  if (!to || !emailProvider.isConfigured()) {
    logger.error('[CRON] domain health alert email NOT sent — alerting unconfigured', {
      module: 'cron',
      route: '/api/cron/domain-health',
      url: result.url,
      status: result.status,
      hasRecipient: !!to,
      emailConfigured: emailProvider.isConfigured(),
    })
    return false
  }

  const body = [
    `Ekklesia domain health check FAILED.`,
    ``,
    `URL:       ${result.url}`,
    `Status:    ${result.status ?? 'no response (request threw)'}`,
    `Error:     ${result.error ?? 'unknown'}`,
    `Checked:   ${checkedAt}`,
    ``,
    REMEDIATION,
  ].join('\n')

  try {
    const res = await emailProvider.send({
      to,
      // Deliberately NOT a key in lib/messaging/templates.ts — this is an operator
      // alert, not a member-facing notification, so it passes its subject/body
      // directly. The Resend provider uses params.subject/params.body and only falls
      // back to this key for the subject. Revisit if the provider becomes
      // template-registry-driven.
      template: 'domain_health_alert',
      params: {
        subject: '🚨 Ekklesia: miaekklesia.com is DOWN',
        body,
      },
      channel: 'email',
      locale: 'en',
    })

    if (!res.success) {
      logger.error('[CRON] domain health alert email failed to send', {
        module: 'cron',
        route: '/api/cron/domain-health',
        error: res.error,
      })
      return false
    }
    return true
  } catch (err) {
    logger.error('[CRON] domain health alert email threw', {
      module: 'cron',
      route: '/api/cron/domain-health',
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  const baseUrl = resolveBaseUrl()
  const healthUrl = `${baseUrl}/api/health`
  const checkedAt = new Date().toISOString()

  // Probe the canonical health URL (core requirement) and the bare apex in
  // parallel. The apex is informational only: it catches the case where www is
  // fine but the apex redirect/cert has broken.
  const [primary, apex] = await Promise.all([probe(healthUrl), probe(resolveApexUrl(baseUrl))])

  if (primary.ok) {
    logger.info('[CRON] domain health check OK', {
      module: 'cron',
      route: '/api/cron/domain-health',
      url: primary.url,
      status: primary.status,
      apexOk: apex.ok,
    })
    return NextResponse.json({
      ok: true,
      url: primary.url,
      status: primary.status,
      apex: { url: apex.url, ok: apex.ok, status: apex.status },
      checkedAt,
    })
  }

  logger.error('[CRON] domain health check FAILED', {
    module: 'cron',
    route: '/api/cron/domain-health',
    url: primary.url,
    status: primary.status,
    error: primary.error,
    apexOk: apex.ok,
    remediation: REMEDIATION,
  })

  const alerted = await sendDownAlert(primary, checkedAt)

  return NextResponse.json({
    ok: false,
    url: primary.url,
    status: primary.status,
    error: primary.error,
    alerted,
    apex: { url: apex.url, ok: apex.ok, status: apex.status },
    checkedAt,
  })
}
