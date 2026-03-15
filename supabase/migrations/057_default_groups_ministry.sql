-- Migration: Add a default "Groups" ministry for each church that doesn't have one.
-- This ministry is used as the default when creating groups without specifying a ministry.

-- Add is_default column to ministries
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Create a unique partial index: at most one default ministry per church
CREATE UNIQUE INDEX IF NOT EXISTS idx_ministries_one_default_per_church
  ON ministries (church_id) WHERE is_default = true;

-- Insert a default ministry for each existing church that doesn't already have one
INSERT INTO ministries (church_id, name, name_ar, is_active, is_default)
SELECT c.id, 'Groups', 'المجموعات', true, true
FROM churches c
WHERE NOT EXISTS (
  SELECT 1 FROM ministries m WHERE m.church_id = c.id AND m.is_default = true
)
ON CONFLICT DO NOTHING;
