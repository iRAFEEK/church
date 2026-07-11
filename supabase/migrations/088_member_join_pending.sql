-- Migration 088: every member join needs church-admin approval (self-signup -> pending)
--
-- Before this, a self-signup member (`/signup` -> pick church) was made 'active'
-- IMMEDIATELY on their first church, so they got full access with no approval. We now
-- gate every join: a self-signup lands 'pending' (no app access) until a church admin
-- (super_admin/ministry_leader) approves them in /admin/join-requests.
--
-- The two PRE-APPROVED doors stay instant and are set explicitly by app code AFTER the
-- trigger runs, so they override the 'pending' default:
--   • church founder  -> app/api/churches/register/route.ts sets status='active'
--   • leader pre-add  -> app/api/members/route.ts sets status='managed'/'invited'
--
-- Semantics of user_churches.status (extends migrations 082/084):
--   active   = normal member (the only state with app access)
--   pending  = self-signup awaiting church-admin approval (no access until approved)
--   managed  = leader-added shadow identity, not yet claimed via OTP
--   invited  = cross-church invite awaiting the invitee's consent
--   inactive = archived / removed (reversible)

-- ── 1. Allow 'pending' in the lifecycle CHECK (drop + re-add, mirroring 084) ──
ALTER TABLE public.user_churches
  DROP CONSTRAINT IF EXISTS user_churches_status_check;

ALTER TABLE public.user_churches
  ADD CONSTRAINT user_churches_status_check
    CHECK (status IN ('active', 'managed', 'inactive', 'invited', 'pending'));

COMMENT ON COLUMN public.user_churches.status IS
  'Membership lifecycle: active = normal member (app access); pending = self-signup awaiting church-admin approval (no access); managed = leader-added shadow identity, not yet claimed via OTP; invited = cross-church invite awaiting consent; inactive = archived/removed (reversible).';

-- ── 2. handle_new_user: self-signup memberships start 'pending' ───────────────
-- IMPORTANT ordering note: the sync_user_churches_role trigger (migration 076) fires
-- on the profiles INSERT below and eagerly creates the user_churches row with the
-- column default 'active'. A plain INSERT ... status='pending' here would therefore be
-- a no-op (ON CONFLICT DO NOTHING). So we force 'pending' with an explicit UPDATE at the
-- end — order-independent, and it only touches the just-created 'active' row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_church_id UUID;
BEGIN
  v_church_id := (NEW.raw_user_meta_data->>'church_id')::UUID;

  -- Require church_id in metadata — never silently assign to wrong church
  IF v_church_id IS NULL THEN
    RAISE WARNING '[handle_new_user] No church_id in metadata for user %, skipping profile creation', NEW.id;
    RETURN NEW;
  END IF;

  -- Create profile with the specified church
  INSERT INTO public.profiles (id, church_id, email, onboarding_completed)
  VALUES (NEW.id, v_church_id, NEW.email, false)
  ON CONFLICT (id) DO NOTHING;

  -- Also create user_churches entry for multi-church consistency
  INSERT INTO public.user_churches (user_id, church_id, role, status)
  VALUES (NEW.id, v_church_id, 'member', 'pending')
  ON CONFLICT (user_id, church_id) DO NOTHING;

  -- Force 'pending' (defeat the sync_user_churches_role trigger, which may have already
  -- inserted this row as 'active' during the profiles INSERT above). The two pre-approved
  -- doors — church founder (register) and leader pre-add (/api/members) — set their own
  -- status right after this trigger returns, overriding 'pending'.
  UPDATE public.user_churches
     SET status = 'pending'
   WHERE user_id = NEW.id
     AND church_id = v_church_id
     AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
