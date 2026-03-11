-- ============================================================
-- Migration 028: Audit Log
-- ARCH: Every sensitive action (member status change, deletion, role change)
-- should be logged. This is both a compliance requirement and debugging tool.
-- Separate from permission_audit_log which only tracks permission changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id uuid NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,          -- e.g. 'member.status_changed', 'group.deleted', 'role.changed'
  entity_type text NOT NULL,     -- e.g. 'profile', 'group', 'event', 'visitor'
  entity_id uuid NOT NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,                -- Optional extra context (IP, user agent, etc.)
  created_at timestamptz DEFAULT now()
);

-- ARCH: Composite index for church-scoped chronological queries (admin audit page)
CREATE INDEX idx_audit_logs_church_created
  ON audit_logs (church_id, created_at DESC);

-- ARCH: Entity index for "show me all changes to this record" queries
CREATE INDEX idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id, created_at DESC);

-- ARCH: Actor index for "show me everything this user did" queries
CREATE INDEX idx_audit_logs_actor
  ON audit_logs (actor_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs for their church
CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'ministry_leader')
    )
  );

-- Service role and admins can insert audit logs
CREATE POLICY "insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid()
    )
  );
