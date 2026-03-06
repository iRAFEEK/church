-- ============================================================
-- EKKLESIA — Event Service Planning (idempotent)
-- Links events to ministries/groups with volunteer requirements
-- and tracks individual member service assignments.
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE event_assignment_status AS ENUM ('assigned','confirmed','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- EVENT SERVICE NEEDS
-- ============================================================

CREATE TABLE IF NOT EXISTS event_service_needs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  ministry_id       UUID REFERENCES ministries(id) ON DELETE CASCADE,
  group_id          UUID REFERENCES groups(id) ON DELETE CASCADE,
  volunteers_needed INTEGER NOT NULL DEFAULT 1,
  notes             TEXT,
  notes_ar          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ministry_or_group CHECK (
    (ministry_id IS NOT NULL AND group_id IS NULL) OR
    (ministry_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Unique per event+ministry or event+group (use COALESCE for partial unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_service_needs_event_ministry
  ON event_service_needs (event_id, ministry_id) WHERE ministry_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_service_needs_event_group
  ON event_service_needs (event_id, group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_service_needs_event ON event_service_needs (event_id);
CREATE INDEX IF NOT EXISTS idx_event_service_needs_ministry ON event_service_needs (ministry_id);
CREATE INDEX IF NOT EXISTS idx_event_service_needs_group ON event_service_needs (group_id);
CREATE INDEX IF NOT EXISTS idx_event_service_needs_church ON event_service_needs (church_id);

-- updated_at trigger
CREATE OR REPLACE TRIGGER trg_event_service_needs_updated
  BEFORE UPDATE ON event_service_needs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- EVENT SERVICE ASSIGNMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS event_service_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_need_id   UUID NOT NULL REFERENCES event_service_needs(id) ON DELETE CASCADE,
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status            event_assignment_status NOT NULL DEFAULT 'assigned',
  status_changed_at TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_need_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_event_service_assignments_need ON event_service_assignments (service_need_id);
CREATE INDEX IF NOT EXISTS idx_event_service_assignments_profile ON event_service_assignments (profile_id);
CREATE INDEX IF NOT EXISTS idx_event_service_assignments_church ON event_service_assignments (church_id);

-- updated_at trigger
CREATE OR REPLACE TRIGGER trg_event_service_assignments_updated
  BEFORE UPDATE ON event_service_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS — EVENT SERVICE NEEDS
-- ============================================================

ALTER TABLE event_service_needs ENABLE ROW LEVEL SECURITY;

-- Church members can read service needs for events in their church
DROP POLICY IF EXISTS "Members read event service needs" ON event_service_needs;
CREATE POLICY "Members read event service needs" ON event_service_needs
  FOR SELECT USING (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can manage service needs
DROP POLICY IF EXISTS "Admins manage event service needs" ON event_service_needs;
CREATE POLICY "Admins manage event service needs" ON event_service_needs
  FOR ALL USING (
    church_id IN (
      SELECT church_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
    )
  );

-- ============================================================
-- RLS — EVENT SERVICE ASSIGNMENTS
-- ============================================================

ALTER TABLE event_service_assignments ENABLE ROW LEVEL SECURITY;

-- Members can read their own assignments
DROP POLICY IF EXISTS "Members read own assignments" ON event_service_assignments;
CREATE POLICY "Members read own assignments" ON event_service_assignments
  FOR SELECT USING (profile_id = auth.uid());

-- Leaders can read assignments for their ministry/group service needs
DROP POLICY IF EXISTS "Leaders read service assignments" ON event_service_assignments;
CREATE POLICY "Leaders read service assignments" ON event_service_assignments
  FOR SELECT USING (
    service_need_id IN (
      SELECT esn.id FROM event_service_needs esn
      LEFT JOIN ministries m ON m.id = esn.ministry_id
      LEFT JOIN groups g ON g.id = esn.group_id
      WHERE m.leader_id = auth.uid()
         OR g.leader_id = auth.uid()
         OR g.co_leader_id = auth.uid()
    )
  );

-- Admins can read all assignments in their church
DROP POLICY IF EXISTS "Admins read all assignments" ON event_service_assignments;
CREATE POLICY "Admins read all assignments" ON event_service_assignments
  FOR SELECT USING (
    church_id IN (
      SELECT church_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
    )
  );

-- Leaders can insert/update/delete assignments for their ministry/group
DROP POLICY IF EXISTS "Leaders manage service assignments" ON event_service_assignments;
CREATE POLICY "Leaders manage service assignments" ON event_service_assignments
  FOR ALL USING (
    service_need_id IN (
      SELECT esn.id FROM event_service_needs esn
      LEFT JOIN ministries m ON m.id = esn.ministry_id
      LEFT JOIN groups g ON g.id = esn.group_id
      WHERE m.leader_id = auth.uid()
         OR g.leader_id = auth.uid()
         OR g.co_leader_id = auth.uid()
    )
  );

-- Members can update their own assignment status (confirm/decline)
DROP POLICY IF EXISTS "Members update own assignment" ON event_service_assignments;
CREATE POLICY "Members update own assignment" ON event_service_assignments
  FOR UPDATE USING (profile_id = auth.uid());

-- Admins can manage all assignments in their church
DROP POLICY IF EXISTS "Admins manage all assignments" ON event_service_assignments;
CREATE POLICY "Admins manage all assignments" ON event_service_assignments
  FOR ALL USING (
    church_id IN (
      SELECT church_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
    )
  );
