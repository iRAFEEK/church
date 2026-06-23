-- ============================================================
-- EKKLESIA — Migration 074: Repair Schema Drift
-- ------------------------------------------------------------
-- Live functional testing surfaced two schema elements that the
-- application code depends on but that are absent from the
-- database (the DB had drifted from the migration history —
-- several migrations use CREATE TABLE/ADD COLUMN IF NOT EXISTS,
-- so edits to already-applied migrations were silently skipped).
--
-- This migration is idempotent and additive — safe to run on any
-- environment, including those already in the correct state.
--
-- NOTE: this is a targeted patch for the two CONFIRMED gaps. The
-- durable fix is to rebuild the database from a clean application
-- of all migrations and reconcile the history; see OPERATIONS_RUNBOOK.md §1.
-- ============================================================

-- 1. funds.currency
-- The funds Zod schema + create route insert a `currency` column, but no
-- migration ever added it to the funds table → fund/campaign creation 500s
-- (PGRST204 "Could not find the 'currency' column of 'funds'"). Backfill
-- existing funds from their church's default currency.
ALTER TABLE funds ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE funds f
SET currency = COALESCE(
  (SELECT c.default_currency FROM churches c WHERE c.id = f.church_id),
  'EGP'
)
WHERE f.currency IS NULL;

ALTER TABLE funds ALTER COLUMN currency SET DEFAULT 'EGP';
ALTER TABLE funds ALTER COLUMN currency SET NOT NULL;

-- Same gap on budgets: the budget schema/route insert a `currency` column that
-- no migration ever added → budget creation 500s (PGRST204).
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS currency TEXT;
UPDATE budgets b
SET currency = COALESCE(
  (SELECT c.default_currency FROM churches c WHERE c.id = b.church_id),
  'EGP'
)
WHERE b.currency IS NULL;
ALTER TABLE budgets ALTER COLUMN currency SET DEFAULT 'EGP';
ALTER TABLE budgets ALTER COLUMN currency SET NOT NULL;

-- 2. songs.published_by_church_id (re-apply migration 072, which did not land here)
-- Without it, "publish song to global library" 500s.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS published_by_church_id UUID REFERENCES churches(id);

CREATE INDEX IF NOT EXISTS idx_songs_published_by
  ON songs (published_by_church_id) WHERE published_by_church_id IS NOT NULL;

-- 3. Duplicate foreign keys (systematic across the finance schema)
-- Migration 030 created `fk_*`-named FKs; later migrations (e.g. 047) re-added
-- `*_fkey`-named FKs with ON DELETE RESTRICT WITHOUT dropping the 030 originals.
-- The result is two identical FKs on the same column, which makes PostgREST
-- embeds ambiguous (PGRST201) and 500s every query that joins these relations
-- (donation recording, campaign list, transaction reads, etc.). This affects
-- clean rebuilds too. Keep the `*_fkey` constraints, drop the `fk_*` duplicates.
ALTER TABLE donations             DROP CONSTRAINT IF EXISTS fk_donation_fund;
ALTER TABLE campaigns             DROP CONSTRAINT IF EXISTS fk_campaign_fund;
ALTER TABLE pledges               DROP CONSTRAINT IF EXISTS fk_pledge_fund;
ALTER TABLE transaction_line_items DROP CONSTRAINT IF EXISTS fk_line_item_fund;
ALTER TABLE event_registrations   DROP CONSTRAINT IF EXISTS fk_event_registration_event;
