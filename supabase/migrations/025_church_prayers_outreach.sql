-- ============================================================
-- Migration 025: Church-Wide Prayer Requests & Outreach Ministry
-- ============================================================

-- ─── Prayer Requests: Make group_id nullable + add anonymous flag ─────

ALTER TABLE prayer_requests ALTER COLUMN group_id DROP NOT NULL;

ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- Partial index for church-wide prayers (group_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_prayer_church_wide
  ON prayer_requests(church_id, status, created_at DESC)
  WHERE group_id IS NULL;

-- ─── Outreach: Add address fields to profiles ────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_ar TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_ar TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_notes TEXT;

-- ─── Outreach: Visit tracking table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS outreach_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visited_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  visit_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  needs_followup  BOOLEAN NOT NULL DEFAULT false,
  followup_date   DATE,
  followup_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_outreach_visits_updated_at ON outreach_visits;
CREATE TRIGGER update_outreach_visits_updated_at
  BEFORE UPDATE ON outreach_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_church ON outreach_visits(church_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_profile ON outreach_visits(profile_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_followup ON outreach_visits(church_id, needs_followup, followup_date)
  WHERE needs_followup = true;

-- RLS
ALTER TABLE outreach_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_visits_select"
  ON outreach_visits FOR SELECT TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "outreach_visits_insert"
  ON outreach_visits FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "outreach_visits_update"
  ON outreach_visits FOR UPDATE TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "outreach_visits_delete"
  ON outreach_visits FOR DELETE TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));
