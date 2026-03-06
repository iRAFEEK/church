-- ============================================================
-- EKKLESIA — Ministry Upgrade: members table, photo, storage
-- ============================================================

-- Add photo_url to ministries
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ============================================================
-- MINISTRY MEMBERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ministry_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id       UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  role_in_ministry  group_member_role NOT NULL DEFAULT 'member',
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(ministry_id, profile_id)
);

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE ministry_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: MINISTRY MEMBERS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users read ministry members" ON ministry_members;
CREATE POLICY "Authenticated users read ministry members"
  ON ministry_members FOR SELECT TO authenticated
  USING (church_id = public.get_church_id());

DROP POLICY IF EXISTS "Admins manage ministry members" ON ministry_members;
CREATE POLICY "Admins manage ministry members"
  ON ministry_members FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Members read own ministry memberships" ON ministry_members;
CREATE POLICY "Members read own ministry memberships"
  ON ministry_members FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- STORAGE: Allow ministry_leader to upload church assets
-- ============================================================

DROP POLICY IF EXISTS "Super admins can upload church assets" ON storage.objects;
CREATE POLICY "Admins can upload church assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'church-assets'
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can update church assets" ON storage.objects;
CREATE POLICY "Admins can update church assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'church-assets'
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Admins can delete church assets" ON storage.objects;
CREATE POLICY "Admins can delete church assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'church-assets'
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );
