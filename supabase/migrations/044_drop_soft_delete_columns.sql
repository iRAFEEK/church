-- P2-5: Drop unused soft-delete columns
-- These columns exist on 5 tables but zero queries filter on them.
-- Dropping pre-launch to simplify schema.

-- Drop partial indexes that reference deleted_at first
DROP INDEX IF EXISTS idx_groups_not_deleted;
DROP INDEX IF EXISTS idx_events_not_deleted;
DROP INDEX IF EXISTS idx_announcements_not_deleted;
DROP INDEX IF EXISTS idx_songs_not_deleted;

-- Drop the columns
ALTER TABLE groups DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE events DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE announcements DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE serving_areas DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE songs DROP COLUMN IF EXISTS deleted_at;
