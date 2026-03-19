-- ============================================================
-- EKKLESIA — Migration 072: Song Publish to Global Library
-- Adds published_by_church_id for attribution when a church
-- shares a song globally.
-- ============================================================

ALTER TABLE songs ADD COLUMN IF NOT EXISTS published_by_church_id UUID REFERENCES churches(id);

CREATE INDEX IF NOT EXISTS idx_songs_published_by ON songs (published_by_church_id) WHERE published_by_church_id IS NOT NULL;
