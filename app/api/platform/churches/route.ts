import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { createAdminClient } from '@/lib/supabase/server'
import { isPlatformAdmin } from '@/lib/platform'
import { logger } from '@/lib/logger'

const reviewSchema = z.object({
  church_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
})

// PATCH /api/platform/churches — platform admin approves/rejects a pending church.
// Gated by email allow-list (isPlatformAdmin), NOT church role. apiHandler still runs
// so the caller is a verified authenticated user before we check the platform list.
export const PATCH = apiHandler(async ({ req, user }) => {
  if (!isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = validate(reviewSchema, await req.json())

  // Service-role client: the platform admin is not a member of the pending church,
  // so RLS would otherwise hide it.
  const admin = await createAdminClient()

  const update =
    body.action === 'approve'
      ? { status: 'active', is_active: true }
      : { status: 'rejected', is_active: false }

  const { data, error } = await admin
    .from('churches')
    .update(update)
    .eq('id', body.church_id)
    .eq('status', 'pending')
    .select('id, name, name_ar, status, is_active')
    .single()

  if (error || !data) {
    logger.error('[/api/platform/churches PATCH] update failed', { module: 'platform', error })
    return NextResponse.json({ error: 'Church not found or already reviewed' }, { status: 404 })
  }

  return NextResponse.json({ data })
})
