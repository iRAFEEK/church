-- Migration: Membership status + claimable shadow identity (onboarding rebuild — Track A3)
--
-- Two related pieces:
--   1. user_churches.status — the membership lifecycle for the "leader adds a member"
--      door. A leader/admin adds someone by name + phone, which creates a phone-only
--      "shadow" auth identity and a 'managed' membership. The person later signs in via
--      WhatsApp OTP (signInWithOtp) as that SAME user and the membership "claims" itself,
--      flipping 'managed' -> 'active'.
--   2. profiles.phone identity hardening — phone is the login credential, so it must be
--      unique-when-present (Supabase already enforces global phone uniqueness on
--      auth.users; this mirrors that at the profile layer + speeds up dedupe lookups).
--      phone_verified_at records when the number was confirmed via OTP claim.
--
-- Semantics of user_churches.status:
--   active   = normal, fully-onboarded member (the only state that gets app access)
--   managed  = leader-added, NOT yet claimed via OTP (a "shadow"/ghost membership)
--   inactive = archived / removed (reversible)
--
-- Backfill: every existing membership is a real member -> 'active'.

-- ── 1. user_churches.status ──────────────────────────────────────────────────

ALTER TABLE public.user_churches
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'managed', 'inactive'));

COMMENT ON COLUMN public.user_churches.status IS
  'Membership lifecycle: active = normal member (app access); managed = leader-added, not yet claimed via OTP (shadow identity); inactive = archived/removed (reversible).';

-- Existing rows pre-date the column default semantics — make them explicitly active.
UPDATE public.user_churches SET status = 'active' WHERE status IS NULL;

-- Partial index supporting the admin directory ("show me managed/unclaimed members")
-- and the claim flow ("flip my managed rows").
CREATE INDEX IF NOT EXISTS idx_user_churches_church_status
  ON public.user_churches (church_id, status);

-- ── 2. profiles.phone identity hardening ─────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.phone_verified_at IS
  'Set when the member confirmed their phone via WhatsApp OTP (the "claim"). NULL = phone unverified / shadow record.';

-- Phone is a credential: optional, but unique when present. Phone-less members
-- (kids/elderly managed records) are allowed and never collide.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_phone_present
  ON public.profiles (phone) WHERE phone IS NOT NULL;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
-- Admin INSERT/UPDATE for OTHER users in the admin's own church already exist
-- (migration 078: "user_churches: admin insert" / "user_churches: admin update"),
-- scoped to church_id = get_church_id() AND admin role — these cover both the
-- A2 approve path and the A3 leader-add path (status='managed'). The person's own
-- SELECT ("user_churches: own select", migration 031) lets them read their managed
-- membership so the claim flow can flip it. The own-UPDATE for the claim is performed
-- server-side via the admin client in /api/members/claim (the person authenticates as
-- themselves; the route scopes the update to user_id = caller), so no new self-update
-- policy is required and managed rows stay non-leakable cross-church.
-- No additional policies needed here.
