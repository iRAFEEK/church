-- ============================================================
-- EKKLESIA -- Phase 7b: Local Bible Storage (idempotent)
-- Replaces api.bible proxy with local Supabase storage.
-- ============================================================

-- ============================================================
-- BIBLE VERSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_versions (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  name_local          TEXT NOT NULL,
  abbreviation        TEXT NOT NULL,
  abbreviation_local  TEXT NOT NULL,
  language_id         TEXT NOT NULL,
  language_name       TEXT NOT NULL,
  language_name_local TEXT NOT NULL,
  description         TEXT,
  description_local   TEXT,
  copyright           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BIBLE BOOKS
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_books (
  id              TEXT NOT NULL,
  bible_id        TEXT NOT NULL REFERENCES bible_versions(id) ON DELETE CASCADE,
  abbreviation    TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_long       TEXT NOT NULL,
  sort_order      INT NOT NULL,
  PRIMARY KEY (bible_id, id)
);

CREATE INDEX IF NOT EXISTS idx_bible_books_order
  ON bible_books (bible_id, sort_order);

-- ============================================================
-- BIBLE CHAPTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_chapters (
  id              TEXT NOT NULL,
  bible_id        TEXT NOT NULL REFERENCES bible_versions(id) ON DELETE CASCADE,
  book_id         TEXT NOT NULL,
  chapter_number  INT NOT NULL,
  reference       TEXT NOT NULL,
  PRIMARY KEY (bible_id, id),
  FOREIGN KEY (bible_id, book_id) REFERENCES bible_books(bible_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bible_chapters_book
  ON bible_chapters (bible_id, book_id, chapter_number);

-- ============================================================
-- BIBLE VERSES
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_verses (
  id              TEXT NOT NULL,
  bible_id        TEXT NOT NULL REFERENCES bible_versions(id) ON DELETE CASCADE,
  book_id         TEXT NOT NULL,
  chapter_id      TEXT NOT NULL,
  verse_number    INT NOT NULL,
  text            TEXT NOT NULL,
  text_search     TSVECTOR,
  PRIMARY KEY (bible_id, id),
  FOREIGN KEY (bible_id, chapter_id) REFERENCES bible_chapters(bible_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bible_verses_chapter
  ON bible_verses (bible_id, chapter_id, verse_number);

CREATE INDEX IF NOT EXISTS idx_bible_verses_fts
  ON bible_verses USING GIN (text_search);

-- Auto-populate tsvector on insert/update
CREATE OR REPLACE FUNCTION bible_verses_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.text_search := to_tsvector('simple', NEW.text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bible_verses_search ON bible_verses;
CREATE TRIGGER trg_bible_verses_search
  BEFORE INSERT OR UPDATE ON bible_verses
  FOR EACH ROW EXECUTE FUNCTION bible_verses_search_trigger();

-- ============================================================
-- RLS — Public read-only for Bible content
-- ============================================================

ALTER TABLE bible_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bible versions" ON bible_versions;
CREATE POLICY "Anyone can read bible versions" ON bible_versions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read bible books" ON bible_books;
CREATE POLICY "Anyone can read bible books" ON bible_books
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read bible chapters" ON bible_chapters;
CREATE POLICY "Anyone can read bible chapters" ON bible_chapters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read bible verses" ON bible_verses;
CREATE POLICY "Anyone can read bible verses" ON bible_verses
  FOR SELECT USING (true);

-- ============================================================
-- CLEANUP — Drop old cache table
-- ============================================================

DROP TABLE IF EXISTS bible_cache;

-- Reset any api.bible IDs to local IDs
UPDATE churches SET default_bible_id = 'ar-svd' WHERE default_bible_id IS NOT NULL;
UPDATE profiles SET preferred_bible_id = NULL WHERE preferred_bible_id IS NOT NULL;
