import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { AddMemberSchema } from '@/lib/schemas/member'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// POST /api/members — Track A3: a leader/admin adds a member by name (+ optional phone),
// creating a claimable "shadow" identity (user_churches.status = 'managed'). The person
// later claims it by signing in via WhatsApp OTP (see /api/members/claim).
//
// Dedupe-by-phone: phone is globally unique on auth.users, so a person who already
// exists (e.g. in another church) is found by phone and only gets a NEW membership row
// — never a duplicate identity. This is also the cross-church add.
//
// Uses createAdminClient() because: (a) we look up identities that may live in OTHER
// churches (not visible under church-scoped RLS), and (b) auth.admin.createUser is
// service-role only.
export const POST = apiHandler(
  async ({ req, profile }) => {
    const input = validate(AddMemberSchema, await req.json())
    const churchId = profile.church_id // membership is ALWAYS scoped to the caller's own church — no IDOR
    const role = input.role ?? 'member'

    // SEC: only a super_admin may seed a non-member (leader) role. A ministry_leader can
    // add members but must not be able to mint group/ministry leaders (a privilege-grant
    // the rest of the app reserves for super_admin).
    if (role !== 'member' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only a super admin can add a member with a leader role' },
        { status: 403 }
      )
    }

    const admin = await createAdminClient()

    // Normalize phone — schema already trimmed + validated E.164 shape when present.
    const phone = input.phone?.trim() || null

    // ── 1. Dedupe: does an identity with this phone already exist? ──────────────
    if (phone) {
      const { data: existing, error: lookupError } = await admin
        .from('profiles')
        .select('id, church_id')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle()

      if (lookupError) {
        logger.error('member add: phone lookup failed', { module: 'members', churchId, error: lookupError })
        throw lookupError
      }

      if (existing) {
        // Person already exists. Do NOT create a new auth user or profile.
        // Add (or report) a membership in THIS church only.
        const { data: membership, error: memErr } = await admin
          .from('user_churches')
          .select('id, status')
          .eq('user_id', existing.id)
          .eq('church_id', churchId)
          .maybeSingle()

        if (memErr) {
          logger.error('member add: membership lookup failed', { module: 'members', churchId, error: memErr })
          throw memErr
        }

        if (membership) {
          // Already a member of this church (any status) — nothing to add.
          return NextResponse.json({ error: 'Already a member of this church' }, { status: 409 })
        }

        const { error: insertErr } = await admin
          .from('user_churches')
          .insert({ user_id: existing.id, church_id: churchId, role, status: 'managed' })

        if (insertErr) {
          // Unique(user_id, church_id) race — treat as already-a-member.
          if (insertErr.code === '23505') {
            return NextResponse.json({ error: 'Already a member of this church' }, { status: 409 })
          }
          logger.error('member add: cross-church membership insert failed', { module: 'members', churchId, error: insertErr })
          throw insertErr
        }

        revalidateTag(`members-${churchId}`)
        revalidateTag(`dashboard-${churchId}`)
        return NextResponse.json({ data: { id: existing.id, added: 'membership' } }, { status: 201 })
      }
    }

    // ── 2. New identity — create the claimable shadow auth user ─────────────────
    // With a phone: phone-only user (phone_confirm so the number is set; the OTP
    // claim later stamps phone_verified_at). Without a phone: phone-less managed
    // record needs SOME credential for the auth.users row that profiles.id FKs to,
    // so we synthesize a unique placeholder email (this person never logs in).
    const createArgs = phone
      ? { phone, phone_confirm: true, user_metadata: { church_id: churchId, managed: true } }
      : {
          email: `managed+${crypto.randomUUID()}@no-reply.ekklesia.app`,
          email_confirm: true,
          user_metadata: { church_id: churchId, managed: true, phoneless: true },
        }

    const { data: authData, error: authError } = await admin.auth.admin.createUser(createArgs)

    if (authError || !authData?.user) {
      // Phone already registered (global uniqueness) — shouldn't happen after the
      // dedupe above, but handle the race cleanly rather than leaking a 500.
      if (authError?.message?.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'Already a member of this church' }, { status: 409 })
      }
      logger.error('member add: createUser failed', { module: 'members', churchId, error: authError })
      throw authError ?? new Error('Failed to create user')
    }

    const userId = authData.user.id

    // The handle_new_user trigger auto-creates a profiles row — UPDATE it with details.
    const { error: profileErr } = await admin
      .from('profiles')
      .update({
        first_name: input.first_name,
        last_name: input.last_name,
        first_name_ar: input.first_name_ar || null,
        last_name_ar: input.last_name_ar || null,
        phone,
        church_id: churchId,
        role,
        status: 'active',
        onboarding_completed: false,
      })
      .eq('id', userId)

    if (profileErr) {
      logger.error('member add: profile update failed', { module: 'members', churchId, error: profileErr })
      throw profileErr
    }

    // Managed membership — the person claims it on first OTP sign-in.
    // NOTE: handle_new_user (migration 048) already inserted a user_churches row as
    // 'active' when the auth user was created, so we UPSERT to force status='managed'
    // (a plain insert would hit the unique conflict and leave it wrongly 'active').
    const { error: ucErr } = await admin
      .from('user_churches')
      .upsert(
        { user_id: userId, church_id: churchId, role, status: 'managed' },
        { onConflict: 'user_id,church_id' }
      )

    if (ucErr) {
      logger.error('member add: user_churches upsert failed', { module: 'members', churchId, error: ucErr })
      throw ucErr
    }

    revalidateTag(`members-${churchId}`)
    revalidateTag(`dashboard-${churchId}`)
    return NextResponse.json({ data: { id: userId, added: 'created', claimable: Boolean(phone) } }, { status: 201 })
  },
  { requireRoles: ['super_admin', 'ministry_leader'], rateLimit: 'strict' }
)
