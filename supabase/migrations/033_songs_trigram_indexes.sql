-- Trigram indexes for fast ilike substring search on songs
-- Matches the Bible search pattern (013_bible_trigram_search.sql)
-- pg_trgm extension already enabled in migration 013

CREATE INDEX IF NOT EXISTS idx_songs_title_trgm
  ON songs USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_songs_title_ar_trgm
  ON songs USING GIN (title_ar gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_songs_artist_trgm
  ON songs USING GIN (artist gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_songs_artist_ar_trgm
  ON songs USING GIN (artist_ar gin_trgm_ops);

-- Composite index for initial load: WHERE is_active = true ORDER BY title
-- Turns seq scan + sort into index scan (13ms → 0.25ms)
CREATE INDEX IF NOT EXISTS idx_songs_active_title
  ON songs (is_active, title) WHERE is_active = true;
