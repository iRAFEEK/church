-- ============================================================
-- EKKLESIA — Phase 2: Visitors, Ministries, Groups (idempotent)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE visitor_status AS ENUM ('new','assigned','contacted','converted','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE age_range_type AS ENUM ('under_18','18_25','26_35','36_45','46_55','56_plus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE how_heard_type AS ENUM ('friend','social_media','website','event','walk_in','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE group_type AS ENUM ('small_group','youth','women','men','family','prayer','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE meeting_frequency_type AS ENUM ('weekly','biweekly','monthly','irregular');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE group_member_role AS ENUM ('member','leader','co_leader');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- VISITORS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS visitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  first_name_ar   TEXT,
  last_name_ar    TEXT,
  phone           TEXT,
  email           TEXT,
  age_range       age_range_type,
  occupation      TEXT,
  how_heard       how_heard_type,
  visited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          visitor_status NOT NULL DEFAULT 'new',
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contacted_at    TIMESTAMPTZ,
  contact_notes   TEXT,
  escalated_at    TIMESTAMPTZ,
  converted_to    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MINISTRIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ministries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  name_ar     TEXT,
  leader_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT,
  description_ar TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_ministries_updated_at ON ministries;
CREATE TRIGGER update_ministries_updated_at
  BEFORE UPDATE ON ministries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GROUPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS groups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  ministry_id         UUID REFERENCES ministries(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  name_ar             TEXT,
  type                group_type NOT NULL DEFAULT 'small_group',
  leader_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  co_leader_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  meeting_day         TEXT,
  meeting_time        TIME,
  meeting_location    TEXT,
  meeting_location_ar TEXT,
  meeting_frequency   meeting_frequency_type NOT NULL DEFAULT 'weekly',
  max_members         INTEGER,
  is_open             BOOLEAN NOT NULL DEFAULT true,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GROUP MEMBERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  role_in_group group_member_role NOT NULL DEFAULT 'member',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(group_id, profile_id)
);

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: VISITORS
-- ============================================================

DROP POLICY IF EXISTS "Admins read all church visitors" ON visitors;
CREATE POLICY "Admins read all church visitors"
  ON visitors FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Leaders read assigned visitors" ON visitors;
CREATE POLICY "Leaders read assigned visitors"
  ON visitors FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "Admins insert visitors" ON visitors;
CREATE POLICY "Admins insert visitors"
  ON visitors FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Admins update all church visitors" ON visitors;
CREATE POLICY "Admins update all church visitors"
  ON visitors FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Leaders update assigned visitors" ON visitors;
CREATE POLICY "Leaders update assigned visitors"
  ON visitors FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND assigned_to = auth.uid()
  );

-- ============================================================
-- RLS: MINISTRIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users read active ministries" ON ministries;
CREATE POLICY "Authenticated users read active ministries"
  ON ministries FOR SELECT TO authenticated
  USING (church_id = public.get_church_id());

DROP POLICY IF EXISTS "Admins manage ministries" ON ministries;
CREATE POLICY "Admins manage ministries"
  ON ministries FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

-- ============================================================
-- RLS: GROUPS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users read active groups" ON groups;
CREATE POLICY "Authenticated users read active groups"
  ON groups FOR SELECT TO authenticated
  USING (church_id = public.get_church_id());

DROP POLICY IF EXISTS "Admins manage groups" ON groups;
CREATE POLICY "Admins manage groups"
  ON groups FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Group leaders update their group" ON groups;
CREATE POLICY "Group leaders update their group"
  ON groups FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (leader_id = auth.uid() OR co_leader_id = auth.uid())
  );

-- ============================================================
-- RLS: GROUP MEMBERS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users read group members" ON group_members;
CREATE POLICY "Authenticated users read group members"
  ON group_members FOR SELECT TO authenticated
  USING (church_id = public.get_church_id());

DROP POLICY IF EXISTS "Admins manage group members" ON group_members;
CREATE POLICY "Admins manage group members"
  ON group_members FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('group_leader', 'ministry_leader', 'super_admin')
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('group_leader', 'ministry_leader', 'super_admin')
  );

DROP POLICY IF EXISTS "Members read own group memberships" ON group_members;
CREATE POLICY "Members read own group memberships"
  ON group_members FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- PUBLIC INSERT POLICY FOR VISITOR FORM (service role bypass)
-- The /api/visitors route uses service role key, so RLS doesn't apply.
-- No anonymous INSERT policy needed.
-- ============================================================
