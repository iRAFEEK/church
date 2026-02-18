-- ============================================================
-- EKKLESIA — Phase 1 RLS Policies (idempotent)
-- ============================================================

-- Helper functions in public schema (auth schema is restricted)
CREATE OR REPLACE FUNCTION public.get_church_id()
RETURNS UUID AS $$
  SELECT church_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- CHURCHES POLICIES
DROP POLICY IF EXISTS "Users can read their church" ON churches;
CREATE POLICY "Users can read their church"
  ON churches FOR SELECT TO authenticated
  USING (id = public.get_church_id());

DROP POLICY IF EXISTS "Super admins can update church settings" ON churches;
CREATE POLICY "Super admins can update church settings"
  ON churches FOR UPDATE TO authenticated
  USING (id = public.get_church_id() AND public.get_user_role() = 'super_admin');

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Super admins read all church profiles" ON profiles;
CREATE POLICY "Super admins read all church profiles"
  ON profiles FOR SELECT TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Ministry leaders read all church profiles" ON profiles;
CREATE POLICY "Ministry leaders read all church profiles"
  ON profiles FOR SELECT TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() = 'ministry_leader');

DROP POLICY IF EXISTS "Group leaders read member profiles" ON profiles;
CREATE POLICY "Group leaders read member profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('group_leader', 'ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- PROFILE MILESTONES POLICIES
DROP POLICY IF EXISTS "Users can read own milestones" ON profile_milestones;
CREATE POLICY "Users can read own milestones"
  ON profile_milestones FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Leaders can read church milestones" ON profile_milestones;
CREATE POLICY "Leaders can read church milestones"
  ON profile_milestones FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('group_leader', 'ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Users can insert own milestones" ON profile_milestones;
CREATE POLICY "Users can insert own milestones"
  ON profile_milestones FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND church_id = public.get_church_id());

DROP POLICY IF EXISTS "Leaders can insert milestones for members" ON profile_milestones;
CREATE POLICY "Leaders can insert milestones for members"
  ON profile_milestones FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('group_leader', 'ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Leaders can delete milestones" ON profile_milestones;
CREATE POLICY "Leaders can delete milestones"
  ON profile_milestones FOR DELETE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

-- STORAGE POLICIES
DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;
CREATE POLICY "Users can upload own profile photo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can update own profile photo" ON storage.objects;
CREATE POLICY "Users can update own profile photo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Authenticated users can read profile photos" ON storage.objects;
CREATE POLICY "Authenticated users can read profile photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can delete own profile photo" ON storage.objects;
CREATE POLICY "Users can delete own profile photo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Public can read church assets" ON storage.objects;
CREATE POLICY "Public can read church assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'church-assets');

DROP POLICY IF EXISTS "Super admins can upload church assets" ON storage.objects;
CREATE POLICY "Super admins can upload church assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'church-assets'
    AND public.get_user_role() = 'super_admin'
  );
