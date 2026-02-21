-- ============================================================
-- EKKLESIA -- Phase 7: Bible Reader (idempotent)
-- ============================================================

-- ============================================================
-- SCHEMA CHANGES TO EXISTING TABLES
-- ============================================================

ALTER TABLE churches ADD COLUMN IF NOT EXISTS default_bible_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_bible_id TEXT;

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE highlight_color AS ENUM ('yellow', 'green', 'blue', 'pink', 'orange');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- BIBLE BOOKMARKS
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_bookmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  bible_id        TEXT NOT NULL,
  book_id         TEXT NOT NULL,
  chapter_id      TEXT NOT NULL,
  verse_id        TEXT,
  reference_label TEXT NOT NULL,
  reference_label_ar TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_user
  ON bible_bookmarks (profile_id, church_id);

CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_ref
  ON bible_bookmarks (profile_id, chapter_id);

-- ============================================================
-- BIBLE HIGHLIGHTS
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_highlights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  bible_id        TEXT NOT NULL,
  book_id         TEXT NOT NULL,
  chapter_id      TEXT NOT NULL,
  verse_id        TEXT NOT NULL,
  reference_label TEXT NOT NULL,
  reference_label_ar TEXT,
  color           highlight_color NOT NULL DEFAULT 'yellow',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bible_highlights_user
  ON bible_highlights (profile_id, church_id);

CREATE INDEX IF NOT EXISTS idx_bible_highlights_chapter
  ON bible_highlights (profile_id, chapter_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bible_highlights_unique
  ON bible_highlights (profile_id, verse_id, bible_id);

-- ============================================================
-- BIBLE CACHE (server-only, no RLS)
-- ============================================================

CREATE TABLE IF NOT EXISTS bible_cache (
  id              TEXT PRIMARY KEY,
  content         JSONB NOT NULL,
  cached_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bible_cache_expiry
  ON bible_cache (expires_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE bible_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own bookmarks" ON bible_bookmarks;
CREATE POLICY "Users read own bookmarks" ON bible_bookmarks
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users create own bookmarks" ON bible_bookmarks;
CREATE POLICY "Users create own bookmarks" ON bible_bookmarks
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users update own bookmarks" ON bible_bookmarks;
CREATE POLICY "Users update own bookmarks" ON bible_bookmarks
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own bookmarks" ON bible_bookmarks;
CREATE POLICY "Users delete own bookmarks" ON bible_bookmarks
  FOR DELETE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users read own highlights" ON bible_highlights;
CREATE POLICY "Users read own highlights" ON bible_highlights
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users create own highlights" ON bible_highlights;
CREATE POLICY "Users create own highlights" ON bible_highlights
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users update own highlights" ON bible_highlights;
CREATE POLICY "Users update own highlights" ON bible_highlights
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own highlights" ON bible_highlights;
CREATE POLICY "Users delete own highlights" ON bible_highlights
  FOR DELETE USING (profile_id = auth.uid());
