-- ============================================================
-- EKKLESIA — Phase 4a: Notifications (idempotent)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('whatsapp','email','in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending','sent','delivered','failed','read');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- NOTIFICATIONS LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type            TEXT NOT NULL,               -- e.g. 'gathering_reminder', 'visitor_assigned'
  channel         notification_channel NOT NULL,
  title           TEXT,
  body            TEXT,
  payload         JSONB DEFAULT '{}',          -- extra data (template params, reference info)
  status          notification_status NOT NULL DEFAULT 'pending',
  reference_id    UUID,                        -- optional FK to related entity
  reference_type  TEXT,                        -- e.g. 'gathering', 'visitor', 'event'
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_profile_status
  ON notifications_log (profile_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_channel
  ON notifications_log (profile_id, channel, status);

CREATE INDEX IF NOT EXISTS idx_notifications_church_created
  ON notifications_log (church_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_reference
  ON notifications_log (reference_type, reference_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DROP POLICY IF EXISTS "Users read own notifications" ON notifications_log;
CREATE POLICY "Users read own notifications" ON notifications_log
  FOR SELECT USING (profile_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users update own notifications" ON notifications_log;
CREATE POLICY "Users update own notifications" ON notifications_log
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Admins can read all notifications in their church
DROP POLICY IF EXISTS "Admins read church notifications" ON notifications_log;
CREATE POLICY "Admins read church notifications" ON notifications_log
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin','ministry_leader')
    )
  );

-- Service role can insert (used by server-side notification dispatcher)
DROP POLICY IF EXISTS "Service insert notifications" ON notifications_log;
CREATE POLICY "Service insert notifications" ON notifications_log
  FOR INSERT WITH CHECK (true);
