-- Migration: Ministry meetings and action items
-- Leaders can schedule meetings and track action items per ministry.

CREATE TABLE IF NOT EXISTS ministry_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ministry_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES ministry_meetings(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ministry_meetings_ministry
  ON ministry_meetings (ministry_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_ministry_meetings_church
  ON ministry_meetings (church_id);
CREATE INDEX IF NOT EXISTS idx_ministry_action_items_meeting
  ON ministry_action_items (meeting_id);
CREATE INDEX IF NOT EXISTS idx_ministry_action_items_assigned
  ON ministry_action_items (assigned_to) WHERE status = 'open';

-- RLS
ALTER TABLE ministry_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_action_items ENABLE ROW LEVEL SECURITY;

-- Leaders and admins can view meetings for their church
CREATE POLICY "Church members can view ministry meetings"
  ON ministry_meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_meetings.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

CREATE POLICY "Leaders can insert ministry meetings"
  ON ministry_meetings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_meetings.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

CREATE POLICY "Leaders can update ministry meetings"
  ON ministry_meetings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_meetings.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

-- Action items policies
CREATE POLICY "Church members can view action items"
  ON ministry_action_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_action_items.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

CREATE POLICY "Leaders can insert action items"
  ON ministry_action_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_action_items.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

CREATE POLICY "Leaders can update action items"
  ON ministry_action_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_action_items.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );
