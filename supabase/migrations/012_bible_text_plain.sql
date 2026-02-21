-- Add a normalized text column without Arabic tashkeel (diacritical marks)
-- This allows searching with plain Arabic keyboard input

-- Helper function to strip Arabic diacritics
CREATE OR REPLACE FUNCTION strip_tashkeel(input TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(
    input,
    '[\u064B-\u065F\u0610-\u061A\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0640]',
    '',
    'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add the plain text column
ALTER TABLE bible_verses ADD COLUMN IF NOT EXISTS text_plain TEXT;

-- Populate it from existing data
UPDATE bible_verses SET text_plain = strip_tashkeel(text);

-- Create index for fast ILIKE searches
CREATE INDEX IF NOT EXISTS idx_bible_verses_text_plain ON bible_verses (bible_id, text_plain text_pattern_ops);

-- Auto-populate on insert/update via trigger
CREATE OR REPLACE FUNCTION bible_verses_set_text_plain() RETURNS TRIGGER AS $$
BEGIN
  NEW.text_plain := strip_tashkeel(NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bible_verses_text_plain ON bible_verses;
CREATE TRIGGER trg_bible_verses_text_plain
  BEFORE INSERT OR UPDATE OF text ON bible_verses
  FOR EACH ROW
  EXECUTE FUNCTION bible_verses_set_text_plain();
