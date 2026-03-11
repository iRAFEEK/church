-- ============================================================
-- Migration 027: Schema Hardening
-- ARCH: Adds updated_at columns + triggers to 14 tables that were missing them.
-- Adds soft delete (deleted_at) to core recoverable entities.
-- Adds church_id to event_visibility_targets for efficient RLS.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add updated_at to tables missing it
-- ────────────────────────────────────────────────────────────

-- group_members
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ministry_members
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_ministry_members_updated_at
  BEFORE UPDATE ON ministry_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- event_registrations
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_event_registrations_updated_at
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- serving_signups
ALTER TABLE serving_signups ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_serving_signups_updated_at
  BEFORE UPDATE ON serving_signups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notifications_log
ALTER TABLE notifications_log ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_notifications_log_updated_at
  BEFORE UPDATE ON notifications_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- serving_area_leaders
ALTER TABLE serving_area_leaders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_serving_area_leaders_updated_at
  BEFORE UPDATE ON serving_area_leaders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- event_visibility_targets
ALTER TABLE event_visibility_targets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_event_visibility_targets_updated_at
  BEFORE UPDATE ON event_visibility_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- event_template_needs
ALTER TABLE event_template_needs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_event_template_needs_updated_at
  BEFORE UPDATE ON event_template_needs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- event_template_segments
ALTER TABLE event_template_segments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TRIGGER set_event_template_segments_updated_at
  BEFORE UPDATE ON event_template_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 2. Soft delete on core entities
-- ARCH: deleted_at enables recovery and audit trail for accidental deletions.
-- Application queries should filter: WHERE deleted_at IS NULL
-- ────────────────────────────────────────────────────────────

ALTER TABLE groups ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE serving_areas ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Partial indexes for efficient queries excluding soft-deleted rows
CREATE INDEX IF NOT EXISTS idx_groups_not_deleted
  ON groups (church_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_not_deleted
  ON events (church_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_not_deleted
  ON announcements (church_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_not_deleted
  ON songs (church_id) WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Add church_id to event_visibility_targets for efficient RLS
-- ARCH: Without this, RLS must JOIN to events table on every query.
-- ────────────────────────────────────────────────────────────

ALTER TABLE event_visibility_targets
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES churches(id) ON DELETE CASCADE;

-- Backfill from events table
UPDATE event_visibility_targets evt
SET church_id = e.church_id
FROM events e
WHERE evt.event_id = e.id
  AND evt.church_id IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE event_visibility_targets
  ALTER COLUMN church_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evt_vis_church
  ON event_visibility_targets (church_id);
