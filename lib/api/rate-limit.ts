import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter using a sliding window.
 * Works within a single serverless instance warm period.
 * For production at scale, replace with @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean expired entries to prevent memory leaks
const CLEANUP_INTERVAL = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

/**
 * Get a client identifier from the request.
 * Uses x-forwarded-for (Vercel sets this), falls back to x-real-ip.
 */
function getClientId(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
  /** Optional key prefix to separate different endpoints */
  prefix?: string
}

/**
 * Check rate limit for a request. Returns null if allowed,
 * or a 429 NextResponse if rate limited.
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  cleanup()

  const clientId = getClientId(req)
  const key = `${options.prefix ?? 'rl'}:${clientId}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 })
    return null
  }

  entry.count++

  if (entry.count > options.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(options.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    )
  }

  return null
}

// Pre-configured rate limiters for common use cases

/** Public endpoints: 20 requests per minute */
export function rateLimitPublic(req: NextRequest) {
  return checkRateLimit(req, { limit: 20, windowSeconds: 60, prefix: 'pub' })
}

/** Mutation endpoints (POST/PUT/DELETE): 30 requests per minute */
export function rateLimitMutation(req: NextRequest) {
  return checkRateLimit(req, { limit: 30, windowSeconds: 60, prefix: 'mut' })
}

/** Sensitive endpoints (auth, registration): 5 requests per minute */
export function rateLimitSensitive(req: NextRequest) {
  return checkRateLimit(req, { limit: 5, windowSeconds: 60, prefix: 'sen' })
}

/** Notification send: 10 per minute */
export function rateLimitNotify(req: NextRequest) {
  return checkRateLimit(req, { limit: 10, windowSeconds: 60, prefix: 'ntf' })
}
