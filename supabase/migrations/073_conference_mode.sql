-- ============================================================
-- 073: Conference Mode
-- Adds full conference coordination layer to existing events:
-- conference_areas, conference_teams, conference_team_members,
-- conference_tasks, conference_resources, conference_broadcasts,
-- conference_broadcast_reads
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE conference_team_role AS ENUM
    ('conference_director','area_director','team_leader','sub_leader','volunteer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conference_task_status AS ENUM
    ('open','in_progress','blocked','done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conference_task_priority AS ENUM
    ('low','normal','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conference_resource_type AS ENUM
    ('equipment','supply','food','transport','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conference_resource_status AS ENUM
    ('needed','requested','confirmed','delivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conference_checkin_status AS ENUM
    ('not_arrived','checked_in','checked_out','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Conference Mode flag on events ─────────────────────────

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS conference_mode     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conference_settings JSONB   NOT NULL DEFAULT '{}';
-- conference_settings keys:
--   campaign_id, budget_id, checkin_open_minutes_before, show_volunteer_qr,
--   published_at, show_ministries, show_schedule, allow_public,
--   public_tagline, public_tagline_ar

-- ─── 1. Conference Areas (hierarchical) ─────────────────────

CREATE TABLE IF NOT EXISTS conference_areas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID        NOT NULL REFERENCES churches(id)        ON DELETE CASCADE,
  event_id        UUID        NOT NULL REFERENCES events(id)          ON DELETE CASCADE,
  parent_area_id  UUID        REFERENCES conference_areas(id)         ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  description_ar  TEXT,
  location_hint   TEXT,
  location_hint_ar TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conf_areas_event   ON conference_areas (event_id);
CREATE INDEX idx_conf_areas_parent  ON conference_areas (parent_area_id);
CREATE INDEX idx_conf_areas_church  ON conference_areas (church_id);

CREATE TRIGGER set_conf_areas_updated_at
  BEFORE UPDATE ON conference_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conference_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can view conference areas"
  ON conference_areas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.church_id = conference_areas.church_id
  ));

CREATE POLICY "Admins can manage conference areas"
  ON conference_areas FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_areas.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- ─── 2. Conference Teams ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS conference_teams (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id        UUID        NOT NULL REFERENCES churches(id)         ON DELETE CASCADE,
  event_id         UUID        NOT NULL REFERENCES events(id)           ON DELETE CASCADE,
  area_id          UUID        NOT NULL REFERENCES conference_areas(id)  ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  name_ar          TEXT,
  description      TEXT,
  description_ar   TEXT,
  muster_point     TEXT,
  muster_point_ar  TEXT,
  target_headcount INTEGER,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conf_teams_event  ON conference_teams (event_id);
CREATE INDEX idx_conf_teams_area   ON conference_teams (area_id);
CREATE INDEX idx_conf_teams_church ON conference_teams (church_id);

CREATE TRIGGER set_conf_teams_updated_at
  BEFORE UPDATE ON conference_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conference_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can view conference teams"
  ON conference_teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.church_id = conference_teams.church_id
  ));

CREATE POLICY "Admins can manage conference teams"
  ON conference_teams FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_teams.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- ─── 3. Conference Team Members (volunteer assignments) ──────

CREATE TABLE IF NOT EXISTS conference_team_members (
  id              UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID                     NOT NULL REFERENCES churches(id)         ON DELETE CASCADE,
  event_id        UUID                     NOT NULL REFERENCES events(id)           ON DELETE CASCADE,
  team_id         UUID                     NOT NULL REFERENCES conference_teams(id)  ON DELETE CASCADE,
  profile_id      UUID                     NOT NULL REFERENCES profiles(id)         ON DELETE CASCADE,
  role            conference_team_role     NOT NULL DEFAULT 'volunteer',
  shift_start     TIMESTAMPTZ,
  shift_end       TIMESTAMPTZ,
  checkin_status  conference_checkin_status NOT NULL DEFAULT 'not_arrived',
  checked_in_at   TIMESTAMPTZ,
  checked_out_at  TIMESTAMPTZ,
  checked_in_by   UUID                     REFERENCES profiles(id) ON DELETE SET NULL,
  task_notes      TEXT,
  assigned_by     UUID                     REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ              NOT NULL DEFAULT now(),
  UNIQUE (team_id, profile_id)
);

CREATE INDEX idx_conf_members_event   ON conference_team_members (event_id);
CREATE INDEX idx_conf_members_team    ON conference_team_members (team_id);
CREATE INDEX idx_conf_members_profile ON conference_team_members (profile_id);
CREATE INDEX idx_conf_members_church  ON conference_team_members (church_id);
CREATE INDEX idx_conf_members_checkin ON conference_team_members (event_id, checkin_status);

ALTER TABLE conference_team_members REPLICA IDENTITY FULL;

CREATE TRIGGER set_conf_members_updated_at
  BEFORE UPDATE ON conference_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conference_team_members ENABLE ROW LEVEL SECURITY;

-- Volunteers see their own assignment
CREATE POLICY "Members can view own team assignment"
  ON conference_team_members FOR SELECT
  USING (profile_id = auth.uid());

-- Team leaders see members in their teams
CREATE POLICY "Team leaders can view their team members"
  ON conference_team_members FOR SELECT
  USING (
    team_id IN (
      SELECT ctm.team_id FROM conference_team_members ctm
      WHERE ctm.profile_id = auth.uid()
        AND ctm.role IN ('team_leader','sub_leader','area_director','conference_director')
    )
  );

-- Admins see all in their church
CREATE POLICY "Admins can view all team members"
  ON conference_team_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_team_members.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- Admins manage all assignments
CREATE POLICY "Admins can manage team members"
  ON conference_team_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_team_members.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- Volunteers can update only their own row (for self-checkin)
CREATE POLICY "Volunteers can self-checkin"
  ON conference_team_members FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ─── 4. Conference Tasks ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS conference_tasks (
  id              UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID                      NOT NULL REFERENCES churches(id)         ON DELETE CASCADE,
  event_id        UUID                      NOT NULL REFERENCES events(id)           ON DELETE CASCADE,
  team_id         UUID                      REFERENCES conference_teams(id)          ON DELETE CASCADE,
  area_id         UUID                      REFERENCES conference_areas(id)          ON DELETE CASCADE,
  card_id         UUID,                     -- FK to conference_board_cards (added in migration 074)
  title           TEXT                      NOT NULL,
  title_ar        TEXT,
  description     TEXT,
  description_ar  TEXT,
  status          conference_task_status    NOT NULL DEFAULT 'open',
  priority        conference_task_priority  NOT NULL DEFAULT 'normal',
  assignee_id     UUID                      REFERENCES profiles(id) ON DELETE SET NULL,
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID                      REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID                      REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ               NOT NULL DEFAULT now(),
  CONSTRAINT chk_task_scope CHECK (
    team_id IS NOT NULL OR area_id IS NOT NULL OR card_id IS NOT NULL
  )
);

CREATE INDEX idx_conf_tasks_event    ON conference_tasks (event_id);
CREATE INDEX idx_conf_tasks_team     ON conference_tasks (team_id);
CREATE INDEX idx_conf_tasks_area     ON conference_tasks (area_id);
CREATE INDEX idx_conf_tasks_assignee ON conference_tasks (assignee_id);
CREATE INDEX idx_conf_tasks_status   ON conference_tasks (event_id, status);
CREATE INDEX idx_conf_tasks_priority ON conference_tasks (event_id, priority);
CREATE INDEX idx_conf_tasks_due      ON conference_tasks (event_id, due_at) WHERE due_at IS NOT NULL;

ALTER TABLE conference_tasks REPLICA IDENTITY FULL;

CREATE TRIGGER set_conf_tasks_updated_at
  BEFORE UPDATE ON conference_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conference_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team tasks"
  ON conference_tasks FOR SELECT
  USING (
    team_id IN (
      SELECT ctm.team_id FROM conference_team_members ctm WHERE ctm.profile_id = auth.uid()
    )
    OR assignee_id = auth.uid()
  );

CREATE POLICY "Admins can view all tasks"
  ON conference_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_tasks.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

CREATE POLICY "Team leaders can manage tasks"
  ON conference_tasks FOR ALL
  USING (
    team_id IN (
      SELECT ctm.team_id FROM conference_team_members ctm
      WHERE ctm.profile_id = auth.uid()
        AND ctm.role IN ('team_leader','sub_leader','area_director','conference_director')
    )
  );

CREATE POLICY "Admins can manage all tasks"
  ON conference_tasks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_tasks.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- Assignees can update their own task status
CREATE POLICY "Assignees can update task status"
  ON conference_tasks FOR UPDATE
  USING (assignee_id = auth.uid())
  WITH CHECK (assignee_id = auth.uid());

-- ─── 5. Conference Resources ──────────────────────────────────

CREATE TABLE IF NOT EXISTS conference_resources (
  id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID                        NOT NULL REFERENCES churches(id)          ON DELETE CASCADE,
  event_id            UUID                        NOT NULL REFERENCES events(id)            ON DELETE CASCADE,
  team_id             UUID                        REFERENCES conference_teams(id)           ON DELETE CASCADE,
  card_id             UUID,                       -- FK to conference_board_cards (added in migration 074)
  name                TEXT                        NOT NULL,
  name_ar             TEXT,
  resource_type       conference_resource_type    NOT NULL DEFAULT 'other',
  quantity_needed     INTEGER                     NOT NULL DEFAULT 1 CHECK (quantity_needed > 0),
  quantity_confirmed  INTEGER,
  status              conference_resource_status  NOT NULL DEFAULT 'needed',
  estimated_cost      NUMERIC(12,2),
  notes               TEXT,
  notes_ar            TEXT,
  requested_by        UUID                        REFERENCES profiles(id) ON DELETE SET NULL,
  fulfilled_by        UUID                        REFERENCES profiles(id) ON DELETE SET NULL,
  fulfilled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  CONSTRAINT chk_resource_scope CHECK (team_id IS NOT NULL OR card_id IS NOT NULL)
);

CREATE INDEX idx_conf_resources_event  ON conference_resources (event_id);
CREATE INDEX idx_conf_resources_team   ON conference_resources (team_id);
CREATE INDEX idx_conf_resources_status ON conference_resources (event_id, status);

CREATE TRIGGER set_conf_resources_updated_at
  BEFORE UPDATE ON conference_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conference_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team resources"
  ON conference_resources FOR SELECT
  USING (
    team_id IN (
      SELECT ctm.team_id FROM conference_team_members ctm WHERE ctm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all resources"
  ON conference_resources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_resources.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

CREATE POLICY "Team leaders can manage resources"
  ON conference_resources FOR ALL
  USING (
    team_id IN (
      SELECT ctm.team_id FROM conference_team_members ctm
      WHERE ctm.profile_id = auth.uid()
        AND ctm.role IN ('team_leader','sub_leader','area_director','conference_director')
    )
  );

CREATE POLICY "Admins can manage all resources"
  ON conference_resources FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_resources.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- ─── 6. Conference Broadcasts ────────────────────────────────

CREATE TABLE IF NOT EXISTS conference_broadcasts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  UUID        NOT NULL REFERENCES churches(id)   ON DELETE CASCADE,
  event_id   UUID        NOT NULL REFERENCES events(id)     ON DELETE CASCADE,
  team_id    UUID        REFERENCES conference_teams(id)    ON DELETE CASCADE,
  area_id    UUID        REFERENCES conference_areas(id)    ON DELETE CASCADE,
  -- NULL team_id AND NULL area_id = all-event broadcast
  sent_by    UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  message_ar TEXT,
  is_urgent  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conf_broadcasts_event ON conference_broadcasts (event_id, created_at DESC);
CREATE INDEX idx_conf_broadcasts_team  ON conference_broadcasts (team_id, created_at DESC);
CREATE INDEX idx_conf_broadcasts_area  ON conference_broadcasts (area_id, created_at DESC);

ALTER TABLE conference_broadcasts REPLICA IDENTITY FULL;

ALTER TABLE conference_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view broadcasts for their team or event"
  ON conference_broadcasts FOR SELECT
  USING (
    event_id IN (
      SELECT ctm.event_id FROM conference_team_members ctm WHERE ctm.profile_id = auth.uid()
    )
    AND (
      team_id IS NULL
      OR area_id IS NULL
      OR team_id IN (
        SELECT ctm.team_id FROM conference_team_members ctm WHERE ctm.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view all broadcasts"
  ON conference_broadcasts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_broadcasts.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

CREATE POLICY "Leaders can send broadcasts"
  ON conference_broadcasts FOR INSERT
  WITH CHECK (
    sent_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.church_id = conference_broadcasts.church_id
    )
  );

CREATE POLICY "Admins can manage all broadcasts"
  ON conference_broadcasts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_broadcasts.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- ─── 7. Broadcast Read Receipts ──────────────────────────────

CREATE TABLE IF NOT EXISTS conference_broadcast_reads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID        NOT NULL REFERENCES conference_broadcasts(id) ON DELETE CASCADE,
  profile_id   UUID        NOT NULL REFERENCES profiles(id)              ON DELETE CASCADE,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, profile_id)
);

CREATE INDEX idx_conf_broadcast_reads_broadcast ON conference_broadcast_reads (broadcast_id);
CREATE INDEX idx_conf_broadcast_reads_profile   ON conference_broadcast_reads (profile_id);

ALTER TABLE conference_broadcast_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own read receipts"
  ON conference_broadcast_reads FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own read receipts"
  ON conference_broadcast_reads FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can view all read receipts"
  ON conference_broadcast_reads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
      JOIN conference_broadcasts cb ON cb.id = conference_broadcast_reads.broadcast_id
    WHERE p.id = auth.uid()
      AND p.church_id = cb.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));
