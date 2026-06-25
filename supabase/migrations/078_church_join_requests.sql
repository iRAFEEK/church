-- Migration: Church join requests (onboarding rebuild — Track A2)
-- Mirrors group_join_requests (058) at the CHURCH level: a person requests to join
-- a church; a super_admin / ministry_leader of that church approves or rejects.
-- The request is separate from membership — on approval the app inserts the active
-- user_churches row. user_churches therefore only ever holds real (active) members.

CREATE TABLE IF NOT EXISTS church_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  -- Requester display info, denormalized at request time. The requester's profile
  -- may live in ANOTHER church (multi-church join), so the approving church can't
  -- read it via RLS — carry what the approver needs on the request itself.
  requester_name TEXT,
  requester_name_ar TEXT,
  requester_phone TEXT,
  requester_email TEXT,
  responded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (church_id, profile_id, status)
);

CREATE INDEX IF NOT EXISTS idx_church_join_requests_church_status
  ON church_join_requests (church_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_church_join_requests_profile
  ON church_join_requests (profile_id, status);

ALTER TABLE church_join_requests ENABLE ROW LEVEL SECURITY;

-- Members can see their own requests (across churches).
CREATE POLICY "Users can view own church join requests"
  ON church_join_requests FOR SELECT
  USING (profile_id = auth.uid());

-- A church's super_admin / ministry_leader can see requests addressed to their church.
CREATE POLICY "Admins can view church join requests"
  ON church_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.church_id = church_join_requests.church_id
        AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

-- Members can create their OWN request, and only in the 'pending' state
-- (can't self-insert an approved request).
CREATE POLICY "Users can create own church join requests"
  ON church_join_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND status = 'pending');

-- A church's admins can approve/reject (update) requests addressed to their church.
CREATE POLICY "Admins can update church join requests"
  ON church_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.church_id = church_join_requests.church_id
        AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

-- ── user_churches: let admins grant/maintain memberships in their own church ──
-- Approving a join request (and the future leader-add flow) inserts a membership
-- for ANOTHER user, which the existing "own insert" policy forbids. Scope these to
-- the admin's active church + admin role (mirrors "user_churches: admin select").
CREATE POLICY "user_churches: admin insert"
  ON public.user_churches FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader')
  );

CREATE POLICY "user_churches: admin update"
  ON public.user_churches FOR UPDATE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader')
  )
  WITH CHECK (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader')
  );
