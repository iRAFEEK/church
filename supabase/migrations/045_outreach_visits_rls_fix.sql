-- ============================================================
-- Migration 045: P2-9 — Restrict outreach_visits RLS policies
-- ============================================================
-- Problem: All four RLS policies on outreach_visits were too permissive,
-- allowing any authenticated church member to read, create, update, and
-- delete sensitive pastoral visit notes.
--
-- Fix: Restrict access to leaders (super_admin, ministry_leader, group_leader),
-- the person who conducted the visit (visited_by), and the person being
-- visited (profile_id).
-- ============================================================

-- ─── DROP existing overly permissive policies ────────────────────────

DROP POLICY IF EXISTS "outreach_visits_select" ON outreach_visits;
DROP POLICY IF EXISTS "outreach_visits_insert" ON outreach_visits;
DROP POLICY IF EXISTS "outreach_visits_update" ON outreach_visits;
DROP POLICY IF EXISTS "outreach_visits_delete" ON outreach_visits;

-- ─── SELECT: leaders + visited_by + profile being visited ───────────

CREATE POLICY "outreach_visits_select"
  ON outreach_visits FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('super_admin', 'ministry_leader', 'group_leader')
      OR visited_by = auth.uid()
      OR profile_id = auth.uid()
    )
  );

-- ─── INSERT: leaders only ───────────────────────────────────────────

CREATE POLICY "outreach_visits_insert"
  ON outreach_visits FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader', 'group_leader')
  );

-- ─── UPDATE: leaders + the person who conducted the visit ───────────

CREATE POLICY "outreach_visits_update"
  ON outreach_visits FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('super_admin', 'ministry_leader', 'group_leader')
      OR visited_by = auth.uid()
    )
  );

-- ─── DELETE: super_admin only ───────────────────────────────────────

CREATE POLICY "outreach_visits_delete"
  ON outreach_visits FOR DELETE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );
