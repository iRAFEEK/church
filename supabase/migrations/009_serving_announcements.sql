-- ============================================================
-- EKKLESIA — Phase 5: Serving & Announcements (idempotent)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE announcement_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE serving_signup_status AS ENUM ('signed_up','confirmed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  body            TEXT,
  body_ar         TEXT,
  status          announcement_status NOT NULL DEFAULT 'draft',
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  expires_at      TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SERVING AREAS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS serving_areas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  ministry_id     UUID REFERENCES ministries(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  description_ar  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SERVING SLOTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS serving_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serving_area_id UUID NOT NULL REFERENCES serving_areas(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  date            DATE NOT NULL,
  start_time      TIME,
  end_time        TIME,
  max_volunteers  INTEGER,
  notes           TEXT,
  notes_ar        TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SERVING SIGNUPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS serving_signups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         UUID NOT NULL REFERENCES serving_slots(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          serving_signup_status NOT NULL DEFAULT 'signed_up',
  signed_up_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at    TIMESTAMPTZ,
  UNIQUE (slot_id, profile_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_announcements_church_status ON announcements (church_id, status);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements (expires_at);
CREATE INDEX IF NOT EXISTS idx_serving_areas_church ON serving_areas (church_id);
CREATE INDEX IF NOT EXISTS idx_serving_slots_area ON serving_slots (serving_area_id);
CREATE INDEX IF NOT EXISTS idx_serving_slots_date ON serving_slots (church_id, date);
CREATE INDEX IF NOT EXISTS idx_serving_signups_slot ON serving_signups (slot_id);
CREATE INDEX IF NOT EXISTS idx_serving_signups_profile ON serving_signups (profile_id);

-- ============================================================
-- RLS — ANNOUNCEMENTS
-- ============================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read published announcements" ON announcements;
CREATE POLICY "Members read published announcements" ON announcements
  FOR SELECT USING (
    status = 'published' AND
    church_id IN (
      SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins read all announcements" ON announcements;
CREATE POLICY "Admins read all announcements" ON announcements
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

DROP POLICY IF EXISTS "Admins manage announcements" ON announcements;
CREATE POLICY "Admins manage announcements" ON announcements
  FOR ALL USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- ============================================================
-- RLS — SERVING AREAS
-- ============================================================

ALTER TABLE serving_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read active areas" ON serving_areas;
CREATE POLICY "Members read active areas" ON serving_areas
  FOR SELECT USING (
    is_active = true AND
    church_id IN (
      SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins read all areas" ON serving_areas;
CREATE POLICY "Admins read all areas" ON serving_areas
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

DROP POLICY IF EXISTS "Admins manage areas" ON serving_areas;
CREATE POLICY "Admins manage areas" ON serving_areas
  FOR ALL USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- ============================================================
-- RLS — SERVING SLOTS
-- ============================================================

ALTER TABLE serving_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read slots" ON serving_slots;
CREATE POLICY "Members read slots" ON serving_slots
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage slots" ON serving_slots;
CREATE POLICY "Admins manage slots" ON serving_slots
  FOR ALL USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- ============================================================
-- RLS — SERVING SIGNUPS
-- ============================================================

ALTER TABLE serving_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own signups" ON serving_signups;
CREATE POLICY "Users read own signups" ON serving_signups
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all signups" ON serving_signups;
CREATE POLICY "Admins read all signups" ON serving_signups
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

DROP POLICY IF EXISTS "Members insert own signups" ON serving_signups;
CREATE POLICY "Members insert own signups" ON serving_signups
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Members update own signups" ON serving_signups;
CREATE POLICY "Members update own signups" ON serving_signups
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins update signups" ON serving_signups;
CREATE POLICY "Admins update signups" ON serving_signups
  FOR UPDATE USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();

CREATE OR REPLACE FUNCTION update_serving_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_serving_areas_updated_at ON serving_areas;
CREATE TRIGGER trg_serving_areas_updated_at
  BEFORE UPDATE ON serving_areas
  FOR EACH ROW EXECUTE FUNCTION update_serving_areas_updated_at();

CREATE OR REPLACE FUNCTION update_serving_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_serving_slots_updated_at ON serving_slots;
CREATE TRIGGER trg_serving_slots_updated_at
  BEFORE UPDATE ON serving_slots
  FOR EACH ROW EXECUTE FUNCTION update_serving_slots_updated_at();
