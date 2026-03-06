-- ============================================================
-- EKKLESIA — 015: Church Leaders table
-- ============================================================

CREATE TABLE IF NOT EXISTS church_leaders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  name_ar        TEXT,
  title          TEXT NOT NULL,
  title_ar       TEXT,
  photo_url      TEXT,
  bio            TEXT,
  bio_ar         TEXT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_church_leaders_church
  ON church_leaders(church_id, display_order);

DROP TRIGGER IF EXISTS update_church_leaders_updated_at ON church_leaders;
CREATE TRIGGER update_church_leaders_updated_at
  BEFORE UPDATE ON church_leaders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE church_leaders ENABLE ROW LEVEL SECURITY;

-- Anyone can read active leaders (needed for public landing page)
CREATE POLICY "Anyone can read active church leaders"
  ON church_leaders FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Super admins manage leaders in their church
CREATE POLICY "Super admins manage church leaders"
  ON church_leaders FOR ALL TO authenticated
  USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Allow anon to read active churches (needed for public landing page)
DO $$ BEGIN
  CREATE POLICY "Anon can read active churches"
    ON churches FOR SELECT TO anon
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
