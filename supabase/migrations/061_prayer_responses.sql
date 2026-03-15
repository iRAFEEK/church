-- ============================================================
-- Migration 057: Prayer Responses ("I'm Praying" feature)
-- Allows members to indicate they are praying for a request
-- ============================================================

CREATE TABLE IF NOT EXISTS prayer_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id   UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prayer_request_id, profile_id)
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_prayer_responses_request ON prayer_responses(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_church ON prayer_responses(church_id);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_profile ON prayer_responses(profile_id);

-- RLS
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prayer_responses_select"
  ON prayer_responses FOR SELECT TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "prayer_responses_insert"
  ON prayer_responses FOR INSERT TO authenticated
  WITH CHECK (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
    AND profile_id = auth.uid()
  );

CREATE POLICY "prayer_responses_delete"
  ON prayer_responses FOR DELETE TO authenticated
  USING (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
    AND profile_id = auth.uid()
  );
