// Standard Webhooks signature verification for the Supabase Send-SMS auth hook.
//
// Implemented directly with Node's crypto (no extra dependency) following the
// Standard Webhooks spec, which Supabase uses for hook signing:
//   signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
//   signature      = base64( HMAC-SHA256(secretBytes, signedContent) )
//   header         = "webhook-signature: v1,<base64sig> [v1,<base64sig> ...]"
// The secret arrives as "v1,whsec_<base64>"; the HMAC key is the base64-decoded
// portion after the "whsec_" prefix.
//
// Reference: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
//            https://www.standardwebhooks.com

import crypto from 'crypto'

// Reject messages whose timestamp is too far from now (replay protection).
const TOLERANCE_SECONDS = 5 * 60

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: string }

/**
 * Extract the raw base64 HMAC key from a "v1,whsec_<base64>" secret.
 * Tolerates a secret supplied with or without the "v1," / "whsec_" prefixes.
 */
function extractKey(secret: string): Buffer {
  const withoutVersion = secret.startsWith('v1,') ? secret.slice('v1,'.length) : secret
  const base64 = withoutVersion.startsWith('whsec_')
    ? withoutVersion.slice('whsec_'.length)
    : withoutVersion
  return Buffer.from(base64, 'base64')
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Compute the expected `v1` signature for a payload — exposed for tests so they
 * can sign fixtures without depending on the standardwebhooks package.
 */
export function computeSignature(
  secret: string,
  id: string,
  timestamp: string,
  rawBody: string
): string {
  const key = extractKey(secret)
  const toSign = `${id}.${timestamp}.${rawBody}`
  return crypto.createHmac('sha256', key).update(toSign, 'utf8').digest('base64')
}

/**
 * Verify a Standard Webhooks signed request.
 *
 * Fails closed: returns { valid: false } when the secret is empty, headers are
 * missing, the timestamp is out of tolerance, or no signature matches.
 */
export function verifySendSmsHook(params: {
  secret: string | undefined
  rawBody: string
  headers: {
    id: string | null
    timestamp: string | null
    signature: string | null
  }
}): VerifyResult {
  const { secret, rawBody, headers } = params

  if (!secret) return { valid: false, reason: 'hook secret not configured' }

  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) {
    return { valid: false, reason: 'missing required webhook headers' }
  }

  const ts = Number.parseInt(timestamp, 10)
  if (Number.isNaN(ts)) {
    return { valid: false, reason: 'invalid timestamp header' }
  }
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) {
    return { valid: false, reason: 'timestamp outside tolerance' }
  }

  let expected: string
  try {
    expected = computeSignature(secret, id, timestamp, rawBody)
  } catch {
    return { valid: false, reason: 'failed to compute signature' }
  }

  // The signature header may carry multiple space-separated "version,sig" entries.
  const passed = signature.split(' ')
  for (const versioned of passed) {
    const [version, sig] = versioned.split(',')
    if (version !== 'v1' || !sig) continue
    if (constantTimeEquals(sig, expected)) {
      return { valid: true }
    }
  }

  return { valid: false, reason: 'no matching signature' }
}
