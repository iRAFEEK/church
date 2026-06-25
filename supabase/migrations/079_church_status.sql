-- Migration: Church status lifecycle (onboarding rebuild — Track A4)
-- Adds a review gate to church registration. A newly registered church starts as
-- 'pending' (and is_active = false, so it's invisible to member search/join). A
-- platform admin approves it on the platform screen, flipping it to 'active'
-- (is_active = true). Existing churches default to 'active' — this is a no-op for them.
--
-- Pending churches are read on the platform screen via the service-role admin client
-- (the approver is not a member of the pending church, so RLS would hide it).

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'rejected', 'inactive'));

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS pending_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS pending_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS pending_contact_phone TEXT;

-- Partial index: the platform queue only ever filters status = 'pending'.
CREATE INDEX IF NOT EXISTS idx_churches_status
  ON churches (status) WHERE status = 'pending';
