-- ============================================================
-- EKKLESIA — Migration 066: Shared Song Library
-- Makes church_id nullable on songs table so songs with
-- NULL church_id are global/shared across all churches.
-- ============================================================

-- 1. Allow NULL church_id for global songs
ALTER TABLE songs ALTER COLUMN church_id DROP NOT NULL;

-- 2. Index for global songs
CREATE INDEX IF NOT EXISTS idx_songs_global
  ON songs (is_active) WHERE church_id IS NULL;

-- 3. Update RLS policies to include global songs (church_id IS NULL)

-- Members can read active songs from their church OR global library
DROP POLICY IF EXISTS "Members read active songs" ON songs;
CREATE POLICY "Members read active songs" ON songs
  FOR SELECT USING (
    is_active = true AND (
      church_id IS NULL
      OR church_id IN (
        SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- Leaders can read all songs (including inactive) from their church OR global library
DROP POLICY IF EXISTS "Leaders read all songs" ON songs;
CREATE POLICY "Leaders read all songs" ON songs
  FOR SELECT USING (
    church_id IS NULL
    OR church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'ministry_leader', 'group_leader')
    )
  );

-- INSERT/UPDATE/DELETE policies remain church-scoped only (no one edits global songs via app)
