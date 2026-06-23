-- ============================================================
-- EKKLESIA — Migration 073: Fix Songs UPDATE Scope (Security)
-- ------------------------------------------------------------
-- Context: Migration 032 (as later relaxed) allowed ANY leader
-- from ANY church to UPDATE ANY song, with no church_id check
-- and no WITH CHECK clause. Because /api/songs/[id] delegates
-- authorization entirely to RLS, this let a leader edit — or
-- reassign — another church's PRIVATE (scoped, non-NULL
-- church_id) song by id. That is a cross-church write IDOR.
--
-- Intended model:
--   * Global songs  (church_id IS NULL) — the shared hymnal;
--     any leader may edit (communal library).
--   * Scoped songs  (church_id = a church) — private to that
--     church; only that church's leaders may edit.
--
-- Fix: scope UPDATE to global-or-own-church, and add WITH CHECK
-- so a song's church_id cannot be reassigned to another church.
-- ============================================================

DROP POLICY IF EXISTS "Leaders update songs" ON songs;
CREATE POLICY "Leaders update songs" ON songs
  FOR UPDATE
  USING (
    public.get_user_role() IN ('super_admin', 'ministry_leader', 'group_leader')
    AND (church_id IS NULL OR church_id = public.get_church_id())
  )
  WITH CHECK (
    church_id IS NULL OR church_id = public.get_church_id()
  );

-- DELETE policy (from 032) is already correctly scoped:
--   church_id = get_church_id() AND role IN (super_admin, ministry_leader)
-- Global songs (NULL) are intentionally not deletable via the app.
-- No change needed here.
