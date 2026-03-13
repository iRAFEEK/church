// ARCH: Lightweight structured logger. Zero external dependencies.
// JSON output in production (for log aggregation), pretty output in development.
// Usage:
//   import { logger } from '@/lib/logger'
//   logger.error('Payment failed', { module: 'finance', churchId, userId, error })
//   logger.info('Cron completed', { module: 'cron', requestId, result })

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export interface LogContext {
  /** Module or subsystem name (e.g. 'finance', 'auth', 'cron', 'messaging') */
  module?: string
  /** HTTP request ID for request tracing */
  requestId?: string
  /** Church ID for multi-tenant context */
  churchId?: string
  /** User ID (never log email or PII — only the UUID) */
  userId?: string
  /** HTTP method */
  method?: string
  /** Route or URL path */
  route?: string
  /** Duration in milliseconds */
  durationMs?: number
  /** Error object — message and stack are extracted automatically */
  error?: unknown
  /** Any additional structured data */
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  module?: string
  requestId?: string
  churchId?: string
  userId?: string
  method?: string
  route?: string
  durationMs?: number
  error?: { message: string; stack?: string }
  [key: string]: unknown
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_TEST = process.env.NODE_ENV === 'test'

// In production, show info+ (skip debug). In dev, show everything.
const MIN_LEVEL: LogLevel = IS_PRODUCTION ? 'info' : 'debug'

function extractError(err: unknown): { message: string; stack?: string } | undefined {
  if (!err) return undefined
  if (err instanceof Error) {
    return { message: err.message, stack: IS_PRODUCTION ? undefined : err.stack }
  }
  if (typeof err === 'string') {
    return { message: err }
  }
  return { message: String(err) }
}

function buildEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
  const { error: rawError, module, requestId, churchId, userId, method, route, durationMs, ...rest } = context ?? {}

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  // Add structured fields only if present (keeps output clean)
  if (module) entry.module = module
  if (requestId) entry.requestId = requestId
  if (churchId) entry.churchId = churchId
  if (userId) entry.userId = userId
  if (method) entry.method = method
  if (route) entry.route = route
  if (durationMs !== undefined) entry.durationMs = durationMs

  const errorInfo = extractError(rawError)
  if (errorInfo) entry.error = errorInfo

  // Spread remaining context fields
  const extraKeys = Object.keys(rest)
  if (extraKeys.length > 0) {
    for (const key of extraKeys) {
      entry[key] = rest[key]
    }
  }

  return entry
}

function formatPretty(entry: LogEntry): string {
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m',  // cyan
    info: '\x1b[32m',   // green
    warn: '\x1b[33m',   // yellow
    error: '\x1b[31m',  // red
  }
  const reset = '\x1b[0m'
  const dim = '\x1b[2m'

  const color = levelColors[entry.level]
  const { timestamp, level, message, error: errorInfo, ...rest } = entry

  const time = dim + timestamp.slice(11, 23) + reset // HH:MM:SS.sss
  const lvl = color + level.toUpperCase().padEnd(5) + reset

  let line = `${time} ${lvl} ${message}`

  // Add key context inline
  const contextParts: string[] = []
  if (rest.module) contextParts.push(`module=${rest.module}`)
  if (rest.churchId) contextParts.push(`church=${rest.churchId.slice(0, 8)}`)
  if (rest.userId) contextParts.push(`user=${rest.userId.slice(0, 8)}`)
  if (rest.requestId) contextParts.push(`req=${rest.requestId.slice(0, 8)}`)
  if (rest.method && rest.route) contextParts.push(`${rest.method} ${rest.route}`)
  if (rest.durationMs !== undefined) contextParts.push(`${rest.durationMs}ms`)

  if (contextParts.length > 0) {
    line += ` ${dim}[${contextParts.join(' | ')}]${reset}`
  }

  if (errorInfo) {
    line += `\n  ${color}Error: ${errorInfo.message}${reset}`
    if (errorInfo.stack) {
      line += `\n${dim}${errorInfo.stack}${reset}`
    }
  }

  return line
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (IS_TEST) return // Silent during tests
  if (LEVEL_VALUES[level] < LEVEL_VALUES[MIN_LEVEL]) return

  const entry = buildEntry(level, message, context)

  if (IS_PRODUCTION) {
    // JSON for log aggregation (Vercel, Datadog, etc.)
    const output = JSON.stringify(entry)
    if (level === 'error') {
      process.stderr?.write ? process.stderr.write(output + '\n') : console.error(output)
    } else {
      process.stdout?.write ? process.stdout.write(output + '\n') : console.log(output)
    }
  } else {
    // Pretty format for development
    const output = formatPretty(entry)
    if (level === 'error') {
      console.error(output)
    } else if (level === 'warn') {
      console.warn(output)
    } else {
      console.log(output)
    }
  }
}

/**
 * Structured logger for Ekklesia.
 *
 * JSON in production, pretty in development.
 * No external dependencies — just structured console output.
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/logger'
 *
 * // Basic
 * logger.info('Donation recorded', { module: 'finance', churchId })
 *
 * // With error
 * logger.error('Cron job failed', { module: 'cron', error: err, route: '/api/cron/event-reminders' })
 *
 * // With request context (used by apiHandler)
 * logger.error('API error', { module: 'api', method: 'POST', route, durationMs: 42, userId, churchId, error })
 * ```
 */
export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
} as const
