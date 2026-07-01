-- Migration: add 'invited' to user_churches.status (onboarding FIX 3 — cross-church consent)
--
-- Context: when a leader/admin "adds a member" whose phone already belongs to a person
-- who exists in ANOTHER church (app/api/members/route.ts, existing-identity branch),
-- we must NOT silently pull that person into this church. The CEO decision is to require
-- explicit consent: that membership is created as 'invited' (pending the person's
-- accept/decline) instead of 'managed'.
--
-- Semantics of user_churches.status (extends migration 082):
--   active   = normal, fully-onboarded member (the only state that gets app access)
--   managed  = leader-added brand-new shadow identity, not yet claimed via OTP
--   invited  = cross-church invitation awaiting the invitee's explicit consent
--              (no app access to this church until they accept -> 'active')
--   inactive = archived / removed (reversible)
--
-- The claim flow (/api/members/claim) only ever flips 'managed' -> 'active', so an
-- 'invited' row is never auto-activated on OTP login — it requires the accept path
-- (PATCH /api/churches/invitations). The access gate (lib/auth.ts, lib/api/handler.ts)
-- already treats any non-'active' status as no-access, so 'invited' is inert until
-- accepted.

ALTER TABLE public.user_churches
  DROP CONSTRAINT IF EXISTS user_churches_status_check;

ALTER TABLE public.user_churches
  ADD CONSTRAINT user_churches_status_check
    CHECK (status IN ('active', 'managed', 'inactive', 'invited'));

COMMENT ON COLUMN public.user_churches.status IS
  'Membership lifecycle: active = normal member (app access); managed = leader-added new shadow identity, not yet claimed via OTP; invited = cross-church invite awaiting the invitee''s consent (no access until accepted); inactive = archived/removed (reversible).';
