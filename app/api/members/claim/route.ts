import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// POST /api/members/claim — Track A3: the "claim".
// When a leader-added (shadow) member signs in for the first time via WhatsApp OTP,
// they authenticate as the SAME user the leader created. This route flips ALL of the
// caller's OWN memberships from 'managed' -> 'active' (pre-added phone = pre-approval,
// no queue) and stamps phone_verified_at on their profile.
//
// - Operates ONLY on the caller's own rows (user_id = caller / id = caller). No IDOR.
// - Idempotent: a no-op (200, claimed: 0) if there's nothing managed to claim, so it's
//   safe to call after every OTP verification.
// - profileOptional: a brand-new claimer may not have an active church yet, but they
//   ARE authenticated. We use `user.id` rather than `profile`.
export const POST = apiHandler(
  async ({ user }) => {
    const userId = user.id
    const admin = await createAdminClient()

    // Flip own managed memberships -> active.
    const { data: claimed, error: claimErr } = await admin
      .from('user_churches')
      .update({ status: 'active' })
      .eq('user_id', userId)
      .eq('status', 'managed')
      .select('church_id')

    if (claimErr) {
      logger.error('member claim: membership update failed', { module: 'members', error: claimErr })
      throw claimErr
    }

    // Stamp phone verification if this user has a phone and it isn't stamped yet.
    const { data: prof } = await admin
      .from('profiles')
      .select('phone, phone_verified_at')
      .eq('id', userId)
      .maybeSingle()

    if (prof?.phone && !prof.phone_verified_at) {
      const { error: stampErr } = await admin
        .from('profiles')
        .update({ phone_verified_at: new Date().toISOString() })
        .eq('id', userId)
      if (stampErr) {
        // Non-fatal — the membership is already claimed; log and move on.
        logger.error('member claim: phone_verified_at stamp failed', { module: 'members', error: stampErr })
      }
    }

    const churchIds = claimed?.map((r) => r.church_id) ?? []
    for (const cid of churchIds) {
      revalidateTag(`members-${cid}`)
      revalidateTag(`dashboard-${cid}`)
    }

    return NextResponse.json({ data: { claimed: churchIds.length } })
  },
  { profileOptional: true, rateLimit: 'strict' }
)
