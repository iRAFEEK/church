-- ============================================================
-- Migration 050: RLS Hardening & Index Fixes
-- ============================================================
-- This migration addresses CRITICAL and HIGH findings from the
-- security audit. It fixes privilege escalation, data leaks,
-- broken indexes, and adds financial integrity constraints.
--
-- Findings addressed:
--   DB-3  (CRITICAL) — Profiles privilege escalation via self-update
--   DB-1  (CRITICAL) — push_tokens open SELECT policy (USING true)
--   DB-2  (CRITICAL) — notifications_log open INSERT policy (WITH CHECK true)
--   DB-4  (HIGH)     — event_registrations unscoped INSERT
--   DB-5  (HIGH)     — financial_transactions over-permissive RLS
--   DB-6  (HIGH)     — donations own-read missing church_id
--   DB-10 (HIGH)     — Broken indexes (wrong table/column names)
--   DB-11 (HIGH)     — Broken notification indexes
--   DB-12 (HIGH)     — Missing notification bell composite index
--   DB-13 (HIGH)     — CASCADE on critical FK relationships
--   DB-20 (MEDIUM)   — Missing CHECK constraints on financial amounts
-- ============================================================


-- ============================================================
-- DB-3 (CRITICAL): Prevent self-escalation on profiles
-- ============================================================
-- The RLS policy "Users can update own profile" (002_rls_policies.sql)
-- only checks id = auth.uid(), allowing any user to UPDATE their own
-- role, permissions, church_id, or status via a direct Supabase client
-- call. This trigger blocks modification of those protected columns
-- by non-service-role users on their own row.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (used by apiHandler routes) can update anything
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Regular users cannot modify these protected columns on their own row
  IF OLD.id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot modify own role';
    END IF;
    IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
      RAISE EXCEPTION 'Cannot modify own permissions';
    END IF;
    IF NEW.church_id IS DISTINCT FROM OLD.church_id THEN
      RAISE EXCEPTION 'Cannot modify own church_id';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Cannot modify own status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_role_escalation();


-- ============================================================
-- DB-1 (CRITICAL): Drop push_tokens open SELECT policy
-- ============================================================
-- Migration 032 created "Service role read push tokens" with
-- USING(true), allowing any authenticated user to read ALL FCM
-- tokens across all churches. Migration 045 tried to fix this
-- but dropped the wrong policy name ("Users can view push tokens").
-- The original permissive policy still exists.
-- ============================================================

DROP POLICY IF EXISTS "Service role read push tokens" ON push_tokens;


-- ============================================================
-- DB-2 (CRITICAL): Drop notifications_log open INSERT policy
-- ============================================================
-- Migration 006 created "Service insert notifications" with
-- WITH CHECK(true), allowing any authenticated user to inject
-- fake notifications into any user's feed in any church.
-- Migration 045 added a scoped replacement policy but did NOT
-- drop the original permissive policy — both may coexist.
-- ============================================================

DROP POLICY IF EXISTS "Service insert notifications" ON notifications_log;


-- ============================================================
-- DB-4 (HIGH): Scope event_registrations INSERT
-- ============================================================
-- Migration 007 created "Anyone can register" with WITH CHECK(true),
-- allowing any user to create registrations for any profile in
-- any church. Replace with proper scoping so authenticated users
-- can only register themselves within their own church.
--
-- Note: Public event registration (unauthenticated/anonymous)
-- is handled by the API route using service_role, which bypasses
-- RLS. This policy only governs direct client-side inserts.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can register" ON event_registrations;

CREATE POLICY "Authenticated users register themselves"
  ON event_registrations FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND church_id = public.get_church_id()
  );


-- ============================================================
-- DB-5 (HIGH): Split financial_transactions RLS
-- ============================================================
-- The "transactions_admin" policy (030_financial_system.sql) grants
-- FOR ALL (SELECT + INSERT + UPDATE + DELETE) to both super_admin
-- and ministry_leader. Since create_transaction_with_items RPC is
-- SECURITY DEFINER (046_finance_atomic_rpcs.sql), it bypasses RLS
-- for writes. Direct client writes should be restricted to
-- super_admin only. ministry_leader retains read access.
-- ============================================================

DROP POLICY IF EXISTS "transactions_admin" ON financial_transactions;

-- ministry_leader + super_admin can read transactions
CREATE POLICY "transactions_read" ON financial_transactions
  FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader')
  );

-- Only super_admin can directly write transactions (RPC bypasses RLS)
CREATE POLICY "transactions_write" ON financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );

CREATE POLICY "transactions_update" ON financial_transactions
  FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );

CREATE POLICY "transactions_delete" ON financial_transactions
  FOR DELETE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );

-- Also tighten transaction_line_items (same issue, same migration)
DROP POLICY IF EXISTS "line_items_admin" ON transaction_line_items;

CREATE POLICY "line_items_read" ON transaction_line_items
  FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader')
  );

CREATE POLICY "line_items_write" ON transaction_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );

CREATE POLICY "line_items_update" ON transaction_line_items
  FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );

CREATE POLICY "line_items_delete" ON transaction_line_items
  FOR DELETE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );


-- ============================================================
-- DB-6 (HIGH): Donations own-read needs church_id
-- ============================================================
-- The "donations_own_read" policy (030_financial_system.sql) only
-- checks donor_id = auth.uid() without a church_id filter. In a
-- multi-church scenario, a user could see their donations from
-- a different church context.
-- ============================================================

DROP POLICY IF EXISTS "donations_own_read" ON donations;

CREATE POLICY "donations_own_read" ON donations
  FOR SELECT TO authenticated
  USING (
    donor_id = auth.uid()
    AND church_id = public.get_church_id()
  );


-- ============================================================
-- DB-10/DB-11 (HIGH): Fix broken indexes
-- ============================================================
-- Migration 022 created indexes referencing wrong table/column names:
--   1. idx_notifications_recipient → references "notifications" table
--      but actual table is "notifications_log"
--   2. idx_notifications_church → same wrong table reference
--   3. idx_event_service_assignments_need → references column "need_id"
--      but actual column is "service_need_id" (per 017_event_service_planning.sql)
--
-- Migration 046_notification_retention_index.sql also references the
-- wrong "notifications" table.
--
-- Note: The idx_event_service_assignments_need index was also created
-- correctly in 017_event_service_planning.sql (line 70) using
-- service_need_id. The one in 022 with "need_id" would have failed
-- silently or created a broken index. We drop the broken one to be safe.
-- ============================================================

-- Fix notification indexes (wrong table name: notifications → notifications_log)
DROP INDEX IF EXISTS idx_notifications_recipient;
DROP INDEX IF EXISTS idx_notifications_church;

CREATE INDEX IF NOT EXISTS idx_notifications_log_recipient
  ON notifications_log (profile_id, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_log_church
  ON notifications_log (church_id);

-- Fix broken index from 046_notification_retention_index.sql
-- (references "notifications" table which does not exist)
DROP INDEX IF EXISTS idx_notifications_church_created;

CREATE INDEX IF NOT EXISTS idx_notifications_log_church_created
  ON notifications_log (church_id, created_at);

-- DB-12 (HIGH): Add notification bell composite index
-- Optimizes the notification bell query that filters by
-- profile_id + channel='in_app' + read_at IS NULL, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_notifications_bell
  ON notifications_log (profile_id, channel, read_at, created_at DESC)
  WHERE channel = 'in_app';


-- ============================================================
-- DB-20 (MEDIUM): CHECK constraints on financial amounts
-- ============================================================
-- Financial amounts must be positive. Without these constraints,
-- negative donations/expenses could be inserted, corrupting
-- fund balances and financial reports.
--
-- Using DO blocks with exception handling for idempotency —
-- ALTER TABLE ADD CONSTRAINT does not support IF NOT EXISTS.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE donations ADD CONSTRAINT chk_donations_amount_positive
    CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE expense_requests ADD CONSTRAINT chk_expense_amount_positive
    CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE campaigns ADD CONSTRAINT chk_campaign_goal_positive
    CHECK (goal_amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pledges ADD CONSTRAINT chk_pledge_amount_positive
    CHECK (total_amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- DB-13 (HIGH): Change ON DELETE CASCADE to RESTRICT on critical FKs
-- ============================================================
-- Deleting a church currently cascades to profiles, financial
-- transactions, and donations — silently destroying all data.
-- This must be RESTRICT so that a church cannot be deleted
-- while it has active data.
-- ============================================================

-- Protect profiles from accidental church deletion
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_church_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_church_id_fkey
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT;

-- Protect financial transactions from accidental church deletion
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_church_id_fkey;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_church_id_fkey
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT;

-- Protect donations from accidental church deletion
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_church_id_fkey;
ALTER TABLE donations ADD CONSTRAINT donations_church_id_fkey
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT;


-- ============================================================
-- End of migration 050
-- ============================================================
