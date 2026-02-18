-- ============================================================
-- EKKLESIA — Phase 4b: Events (idempotent)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft','published','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM ('registered','confirmed','cancelled','checked_in');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id               UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  created_by              UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title                   TEXT NOT NULL,
  title_ar                TEXT,
  description             TEXT,
  description_ar          TEXT,
  event_type              TEXT NOT NULL DEFAULT 'general',  -- general, worship, conference, community, youth, etc.
  starts_at               TIMESTAMPTZ NOT NULL,
  ends_at                 TIMESTAMPTZ,
  location                TEXT,
  capacity                INTEGER,
  is_public               BOOLEAN NOT NULL DEFAULT false,
  registration_required   BOOLEAN NOT NULL DEFAULT false,
  registration_closes_at  TIMESTAMPTZ,
  target_audience         JSONB DEFAULT '{}',   -- { groups: [...], ministries: [...], roles: [...] }
  status                  event_status NOT NULL DEFAULT 'draft',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EVENT REGISTRATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS event_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visitor_id      UUID REFERENCES visitors(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  status          registration_status NOT NULL DEFAULT 'registered',
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_in_at     TIMESTAMPTZ,
  CONSTRAINT fk_event_registration_event FOREIGN KEY (event_id) REFERENCES events(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_events_church_status
  ON events (church_id, status);

CREATE INDEX IF NOT EXISTS idx_events_starts_at
  ON events (starts_at);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event
  ON event_registrations (event_id);

CREATE INDEX IF NOT EXISTS idx_event_registrations_profile
  ON event_registrations (profile_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read published events in their church
DROP POLICY IF EXISTS "Users read published events" ON events;
CREATE POLICY "Users read published events" ON events
  FOR SELECT USING (
    status = 'published' AND
    church_id IN (
      SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Public events are readable without auth
DROP POLICY IF EXISTS "Public read public events" ON events;
CREATE POLICY "Public read public events" ON events
  FOR SELECT USING (is_public = true AND status = 'published');

-- Admins can read all events (including drafts)
DROP POLICY IF EXISTS "Admins read all events" ON events;
CREATE POLICY "Admins read all events" ON events
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- Admins can create/update events
DROP POLICY IF EXISTS "Admins manage events" ON events;
CREATE POLICY "Admins manage events" ON events
  FOR ALL USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- Members read own registrations
DROP POLICY IF EXISTS "Users read own registrations" ON event_registrations;
CREATE POLICY "Users read own registrations" ON event_registrations
  FOR SELECT USING (profile_id = auth.uid());

-- Admins read all registrations in their church
DROP POLICY IF EXISTS "Admins read registrations" ON event_registrations;
CREATE POLICY "Admins read registrations" ON event_registrations
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- Anyone can register (including public/anonymous for public events)
DROP POLICY IF EXISTS "Anyone can register" ON event_registrations;
CREATE POLICY "Anyone can register" ON event_registrations
  FOR INSERT WITH CHECK (true);

-- Admins can update registrations (check-in)
DROP POLICY IF EXISTS "Admins update registrations" ON event_registrations;
CREATE POLICY "Admins update registrations" ON event_registrations
  FOR UPDATE USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();
