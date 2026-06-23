import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiter with two backends:
 *
 *  1. Distributed (preferred): Upstash Redis sliding window, shared across all
 *     serverless instances. Active automatically when UPSTASH_REDIS_REST_URL
 *     and UPSTASH_REDIS_REST_TOKEN are set. This is the production path — on
 *     Vercel, many short-lived instances each have their own memory, so an
 *     in-memory limiter is far weaker than it looks.
 *  2. In-memory fallback: a single-instance sliding window. Used when Upstash
 *     is not configured (local dev / tests) or if Redis is unreachable.
 *
 * `checkRateLimit` is the sync in-memory implementation (kept for the fallback
 * path and direct unit tests). `checkRateLimitAsync` is the entry point callers
 * should use — it prefers Upstash and falls back to in-memory automatically.
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
 * DB-6 fix: prefer user ID for authenticated routes (shared church WiFi = all devices share one IP).
 * Falls back to IP-based for unauthenticated requests (brute force protection).
 */
function getClientId(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`
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
  /** Authenticated user ID — when provided, rate limits per-user instead of per-IP */
  userId?: string
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

  const clientId = getClientId(req, options.userId)
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

// ── Distributed (Upstash Redis) backend ────────────────────────────────────

let redisClient: Redis | null = null
let redisChecked = false
const limiterCache = new Map<string, Ratelimit>()

/** Lazily build the Redis client. Returns null when Upstash isn't configured. */
function getRedis(): Redis | null {
  if (redisChecked) return redisClient
  redisChecked = true
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redisClient = new Redis({ url, token })
  return redisClient
}

/** One Ratelimit instance per (limit, window) pair, reused across requests. */
function getLimiter(limit: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  const cacheKey = `${limit}:${windowSeconds}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: 'ekklesia_rl',
      analytics: false,
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

/**
 * Check rate limit, preferring the distributed Upstash backend and falling back
 * to the in-memory limiter when Upstash is unconfigured or unreachable.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 */
export async function checkRateLimitAsync(
  req: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const limiter = getLimiter(options.limit, options.windowSeconds)
  if (!limiter) return checkRateLimit(req, options)

  const clientId = getClientId(req, options.userId)
  const key = `${options.prefix ?? 'rl'}:${clientId}`

  try {
    const { success, limit, remaining, reset } = await limiter.limit(key)
    if (success) return null

    const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000))
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(Math.max(0, remaining)),
          'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
        },
      }
    )
  } catch {
    // Redis hiccup — fail back to in-memory rather than blocking traffic.
    return checkRateLimit(req, options)
  }
}

// Pre-configured rate limiters for common use cases (distributed-aware).

/** Public endpoints: 20 requests per minute */
export function rateLimitPublic(req: NextRequest) {
  return checkRateLimitAsync(req, { limit: 20, windowSeconds: 60, prefix: 'pub' })
}

/** Mutation endpoints (POST/PUT/DELETE): 30 requests per minute */
export function rateLimitMutation(req: NextRequest) {
  return checkRateLimitAsync(req, { limit: 30, windowSeconds: 60, prefix: 'mut' })
}

/** Sensitive endpoints (auth, registration): 5 requests per minute */
export function rateLimitSensitive(req: NextRequest) {
  return checkRateLimitAsync(req, { limit: 5, windowSeconds: 60, prefix: 'sen' })
}

/** Notification send: 10 per minute */
export function rateLimitNotify(req: NextRequest) {
  return checkRateLimitAsync(req, { limit: 10, windowSeconds: 60, prefix: 'ntf' })
}
