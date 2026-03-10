-- Run this in Supabase SQL Editor
-- Adds assigned_to column to prayer_requests for assigning prayers to members

ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_prayer_assigned ON prayer_requests(assigned_to) WHERE assigned_to IS NOT NULL;
