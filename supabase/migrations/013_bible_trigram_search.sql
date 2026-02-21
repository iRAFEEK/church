-- Enable trigram extension for fast mid-text ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop the old pattern_ops index (only works for prefix matches)
DROP INDEX IF EXISTS idx_bible_verses_text_plain;

-- Create trigram GIN index — makes ILIKE '%word%' instant
CREATE INDEX idx_bible_verses_text_plain_trgm
  ON bible_verses USING GIN (text_plain gin_trgm_ops);
