-- 077_profiles_superadmin_update_withcheck.sql
-- SEC-4 (P0 audit): the "Super admins can update any profile" policy (002) had a
-- USING clause but no WITH CHECK. Without WITH CHECK, a super_admin could UPDATE a
-- profile's church_id to a DIFFERENT tenant (the USING clause only gates which rows
-- are visible to update, not what the updated row may become). Add a matching
-- WITH CHECK so the post-update row must still belong to the admin's own church.

DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() = 'super_admin')
  WITH CHECK (church_id = public.get_church_id() AND public.get_user_role() = 'super_admin');
