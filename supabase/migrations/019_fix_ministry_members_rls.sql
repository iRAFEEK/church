-- ============================================================
-- Fix ministry_members RLS: split FOR ALL into separate policies
-- The FOR ALL policy blocks INSERT because USING can't match
-- a row that doesn't exist yet.
-- ============================================================

-- Drop the old combined policy
DROP POLICY IF EXISTS "Admins manage ministry members" ON ministry_members;

-- Separate INSERT policy (only WITH CHECK, no USING needed)
CREATE POLICY "Admins insert ministry members"
  ON ministry_members FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

-- Separate UPDATE policy
CREATE POLICY "Admins update ministry members"
  ON ministry_members FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

-- Separate DELETE policy
CREATE POLICY "Admins delete ministry members"
  ON ministry_members FOR DELETE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );
