import { headers } from 'next/headers'

/**
 * Resolve the app's public origin for building shareable links (QR codes, etc.).
 *
 * Precedence:
 *  1. NEXT_PUBLIC_APP_URL when explicitly set to a non-localhost URL (operator
 *     override — lets a church pin a canonical/custom domain).
 *  2. The actual request host (x-forwarded-host/host on Vercel) — zero-config
 *     correct on any deployment, preview URL, or custom domain.
 *  3. localhost fallback (local dev with no headers).
 */
export function resolveAppOrigin(
  envUrl: string | undefined,
  host: string | null,
  proto: string | null
): string {
  if (envUrl && !envUrl.includes('localhost')) return envUrl.replace(/\/$/, '')
  if (host) {
    const scheme = proto || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https')
    return `${scheme}://${host}`
  }
  return (envUrl || 'http://localhost:3000').replace(/\/$/, '')
}

/** Server-side helper: origin of the current request. */
export async function getAppOrigin(): Promise<string> {
  const h = await headers()
  return resolveAppOrigin(
    process.env.NEXT_PUBLIC_APP_URL,
    h.get('x-forwarded-host') ?? h.get('host'),
    h.get('x-forwarded-proto')
  )
}
