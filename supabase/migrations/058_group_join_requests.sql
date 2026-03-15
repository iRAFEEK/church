-- Migration: Group join requests
-- Allows members to request to join a group, with leader approval/rejection.

CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  responded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (group_id, profile_id, status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_status
  ON group_join_requests (group_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_group_join_requests_profile
  ON group_join_requests (profile_id, status);

-- RLS
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Members can see their own requests
CREATE POLICY "Users can view own join requests"
  ON group_join_requests FOR SELECT
  USING (profile_id = (SELECT id FROM profiles WHERE id = auth.uid()));

-- Leaders/admins can see requests for their groups
CREATE POLICY "Leaders can view group join requests"
  ON group_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_join_requests.group_id
      AND (g.leader_id = auth.uid() OR g.co_leader_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = group_join_requests.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

-- Members can insert their own requests
CREATE POLICY "Users can create join requests"
  ON group_join_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Leaders/admins can update (approve/reject)
CREATE POLICY "Leaders can update join requests"
  ON group_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_join_requests.group_id
      AND (g.leader_id = auth.uid() OR g.co_leader_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = group_join_requests.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );
