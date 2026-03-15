-- ============================================================
-- Migration 056: Outreach Assignments
-- ============================================================
-- Allows leaders to assign members for outreach follow-up.
-- An assignment links a member (the person to be reached) to
-- an assignee (the person doing the outreach).

CREATE TABLE IF NOT EXISTS outreach_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    UUID NOT NULL REFERENCES churches(id),
  member_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to  UUID NOT NULL REFERENCES profiles(id),
  assigned_by  UUID NOT NULL REFERENCES profiles(id),
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_outreach_assignments_church ON outreach_assignments(church_id);
CREATE INDEX idx_outreach_assignments_member ON outreach_assignments(member_id, church_id);
CREATE INDEX idx_outreach_assignments_assigned ON outreach_assignments(assigned_to, church_id);

-- Trigger for updated_at
CREATE TRIGGER set_outreach_assignments_updated_at
  BEFORE UPDATE ON outreach_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE outreach_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outreach_assignments_select"
  ON outreach_assignments FOR SELECT TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "outreach_assignments_insert"
  ON outreach_assignments FOR INSERT TO authenticated
  WITH CHECK (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "outreach_assignments_update"
  ON outreach_assignments FOR UPDATE TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "outreach_assignments_delete"
  ON outreach_assignments FOR DELETE TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));
