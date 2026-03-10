-- ============================================================
-- Fix: Add RLS policies for church-wide prayers (group_id IS NULL)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Allow any authenticated member to submit church-wide prayers
DROP POLICY IF EXISTS "Members submit church-wide prayers" ON prayer_requests;
CREATE POLICY "Members submit church-wide prayers"
  ON prayer_requests FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND submitted_by = auth.uid()
    AND group_id IS NULL
  );

-- Allow members to read their own church-wide prayers
DROP POLICY IF EXISTS "Members read own church-wide prayers" ON prayer_requests;
CREATE POLICY "Members read own church-wide prayers"
  ON prayer_requests FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND group_id IS NULL
    AND submitted_by = auth.uid()
  );

-- Allow super_admin to read all church-wide prayers
DROP POLICY IF EXISTS "Super admins read all church-wide prayers" ON prayer_requests;
CREATE POLICY "Super admins read all church-wide prayers"
  ON prayer_requests FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND group_id IS NULL
    AND public.get_user_role() = 'super_admin'
  );

-- Allow super_admin to manage (update/delete) church-wide prayers
DROP POLICY IF EXISTS "Super admins manage church-wide prayers" ON prayer_requests;
CREATE POLICY "Super admins manage church-wide prayers"
  ON prayer_requests FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND group_id IS NULL
    AND public.get_user_role() = 'super_admin'
  );

-- Allow members to delete their own church-wide prayers
DROP POLICY IF EXISTS "Members delete own church-wide prayers" ON prayer_requests;
CREATE POLICY "Members delete own church-wide prayers"
  ON prayer_requests FOR DELETE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND group_id IS NULL
    AND submitted_by = auth.uid()
  );
