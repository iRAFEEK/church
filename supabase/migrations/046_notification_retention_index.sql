-- Migration 046: Add composite index for notification retention cleanup
-- Supports efficient deletion of notifications older than N days
-- The cron job at /api/cron/notification-cleanup filters by created_at

CREATE INDEX IF NOT EXISTS idx_notifications_church_created
  ON notifications (church_id, created_at);
