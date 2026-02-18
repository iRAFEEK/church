-- ============================================================
-- EKKLESIA — Phase 3: Gatherings, Attendance, Prayer (idempotent)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE gathering_status AS ENUM ('scheduled','in_progress','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present','absent','excused','late');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prayer_status AS ENUM ('active','answered','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- GATHERINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS gatherings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  actual_start    TIMESTAMPTZ,
  location        TEXT,
  location_ar     TEXT,
  topic           TEXT,
  topic_ar        TEXT,
  notes           TEXT,
  status          gathering_status NOT NULL DEFAULT 'scheduled',
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_gatherings_updated_at ON gatherings;
CREATE TRIGGER update_gatherings_updated_at
  BEFORE UPDATE ON gatherings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id    UUID NOT NULL REFERENCES gatherings(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  status          attendance_status NOT NULL DEFAULT 'absent',
  excuse_reason   TEXT,
  marked_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  marked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gathering_id, profile_id)
);

-- ============================================================
-- PRAYER REQUESTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS prayer_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gathering_id    UUID REFERENCES gatherings(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  submitted_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  status          prayer_status NOT NULL DEFAULT 'active',
  resolved_at     TIMESTAMPTZ,
  resolved_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_prayer_requests_updated_at ON prayer_requests;
CREATE TRIGGER update_prayer_requests_updated_at
  BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: GATHERINGS
-- ============================================================

DROP POLICY IF EXISTS "Members read gatherings in their groups" ON gatherings;
CREATE POLICY "Members read gatherings in their groups"
  ON gatherings FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT gm.group_id FROM group_members gm
        WHERE gm.profile_id = auth.uid() AND gm.is_active = true
      )
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Leaders manage their gatherings" ON gatherings;
CREATE POLICY "Leaders manage their gatherings"
  ON gatherings FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  );

-- ============================================================
-- RLS: ATTENDANCE
-- ============================================================

DROP POLICY IF EXISTS "Members read own attendance" ON attendance;
CREATE POLICY "Members read own attendance"
  ON attendance FOR SELECT TO authenticated
  USING (profile_id = auth.uid() AND church_id = public.get_church_id());

DROP POLICY IF EXISTS "Leaders read and manage group attendance" ON attendance;
CREATE POLICY "Leaders read and manage group attendance"
  ON attendance FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  );

-- ============================================================
-- RLS: PRAYER REQUESTS
-- ============================================================

DROP POLICY IF EXISTS "Leaders read all prayer requests in their groups" ON prayer_requests;
CREATE POLICY "Leaders read all prayer requests in their groups"
  ON prayer_requests FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Members read non-private requests in their groups" ON prayer_requests;
CREATE POLICY "Members read non-private requests in their groups"
  ON prayer_requests FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND is_private = false
    AND group_id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.profile_id = auth.uid() AND gm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Members read own private requests" ON prayer_requests;
CREATE POLICY "Members read own private requests"
  ON prayer_requests FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() AND church_id = public.get_church_id());

DROP POLICY IF EXISTS "Members submit requests to their groups" ON prayer_requests;
CREATE POLICY "Members submit requests to their groups"
  ON prayer_requests FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND submitted_by = auth.uid()
    AND (
      group_id IN (
        SELECT gm.group_id FROM group_members gm
        WHERE gm.profile_id = auth.uid() AND gm.is_active = true
      )
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Leaders manage prayer requests in their groups" ON prayer_requests;
CREATE POLICY "Leaders manage prayer requests in their groups"
  ON prayer_requests FOR ALL TO authenticated
  USING (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND (
      public.get_user_role() IN ('ministry_leader', 'super_admin')
      OR group_id IN (
        SELECT g.id FROM groups g
        WHERE g.leader_id = auth.uid() OR g.co_leader_id = auth.uid()
      )
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_gatherings_group_id     ON gatherings(group_id);
CREATE INDEX IF NOT EXISTS idx_gatherings_church_id    ON gatherings(church_id);
CREATE INDEX IF NOT EXISTS idx_gatherings_scheduled_at ON gatherings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_attendance_gathering_id ON attendance(gathering_id);
CREATE INDEX IF NOT EXISTS idx_attendance_profile_id   ON attendance(profile_id);
CREATE INDEX IF NOT EXISTS idx_attendance_group_id     ON attendance(group_id);
CREATE INDEX IF NOT EXISTS idx_prayer_group_id         ON prayer_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_prayer_gathering_id     ON prayer_requests(gathering_id);
