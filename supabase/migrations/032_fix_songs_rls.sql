-- ============================================================
-- Fix songs RLS: shared song library readable by all authenticated users.
-- Songs are a shared resource — every church can read the full library.
-- Write operations (create/update/delete) remain scoped to church leaders.
-- ============================================================

-- All authenticated users can read active songs (shared library)
DROP POLICY IF EXISTS "Members read active songs" ON songs;
CREATE POLICY "Members read active songs" ON songs
  FOR SELECT USING (
    is_active = true AND
    auth.uid() IS NOT NULL
  );

-- Leaders+ can read all songs including inactive
DROP POLICY IF EXISTS "Leaders read all songs" ON songs;
CREATE POLICY "Leaders read all songs" ON songs
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('super_admin', 'ministry_leader', 'group_leader')
  );

-- Leaders+ can create songs in their active church
DROP POLICY IF EXISTS "Leaders create songs" ON songs;
CREATE POLICY "Leaders create songs" ON songs
  FOR INSERT WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader', 'group_leader')
  );

-- Leaders+ can update songs in their active church
DROP POLICY IF EXISTS "Leaders update songs" ON songs;
CREATE POLICY "Leaders update songs" ON songs
  FOR UPDATE USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader', 'group_leader')
  );

-- Admins can delete songs in their active church
DROP POLICY IF EXISTS "Admins delete songs" ON songs;
CREATE POLICY "Admins delete songs" ON songs
  FOR DELETE USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader')
  );
