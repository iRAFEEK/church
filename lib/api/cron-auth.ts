import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Verify cron job authorization using timing-safe comparison.
 * Returns null if authorized, or an error Response if not.
 *
 * Fixes:
 * - Fails closed if CRON_SECRET is unset (returns 500, not bypass)
 * - Uses timingSafeEqual to prevent timing side-channel attacks
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const provided = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!provided) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use timing-safe comparison to prevent side-channel attacks
  try {
    const a = Buffer.from(provided)
    const b = Buffer.from(cronSecret)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // Authorized
}
