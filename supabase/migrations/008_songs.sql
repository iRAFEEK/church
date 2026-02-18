-- ============================================================
-- EKKLESIA — Phase 6: Songs & Worship Presenter (idempotent)
-- ============================================================

-- ============================================================
-- SONGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS songs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,

  title             TEXT NOT NULL,
  title_ar          TEXT,
  artist            TEXT,
  artist_ar         TEXT,
  lyrics            TEXT,
  lyrics_ar         TEXT,
  tags              TEXT[] DEFAULT '{}',

  display_settings  JSONB NOT NULL DEFAULT '{"bg_color":"#000000","bg_image":null,"text_color":"#ffffff","font_family":"sans","font_size":48}',

  is_active         BOOLEAN NOT NULL DEFAULT true,

  search_vector     tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(title_ar, '') || ' ' ||
      coalesce(artist, '') || ' ' ||
      coalesce(artist_ar, '') || ' ' ||
      coalesce(lyrics, '') || ' ' ||
      coalesce(lyrics_ar, '')
    )
  ) STORED,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_songs_church
  ON songs (church_id);

CREATE INDEX IF NOT EXISTS idx_songs_search
  ON songs USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_songs_active
  ON songs (church_id, is_active);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- All church members can read active songs
DROP POLICY IF EXISTS "Members read active songs" ON songs;
CREATE POLICY "Members read active songs" ON songs
  FOR SELECT USING (
    is_active = true AND
    church_id IN (
      SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Leaders+ can read all songs (including inactive)
DROP POLICY IF EXISTS "Leaders read all songs" ON songs;
CREATE POLICY "Leaders read all songs" ON songs
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'ministry_leader', 'group_leader')
    )
  );

-- Leaders+ can create songs
DROP POLICY IF EXISTS "Leaders create songs" ON songs;
CREATE POLICY "Leaders create songs" ON songs
  FOR INSERT WITH CHECK (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'ministry_leader', 'group_leader')
    )
  );

-- Leaders+ can update songs
DROP POLICY IF EXISTS "Leaders update songs" ON songs;
CREATE POLICY "Leaders update songs" ON songs
  FOR UPDATE USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'ministry_leader', 'group_leader')
    )
  );

-- Admins can delete songs
DROP POLICY IF EXISTS "Admins delete songs" ON songs;
CREATE POLICY "Admins delete songs" ON songs
  FOR DELETE USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'ministry_leader')
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_songs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_songs_updated_at ON songs;
CREATE TRIGGER trg_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_songs_updated_at();

-- ============================================================
-- STORAGE BUCKET for song backgrounds
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'song-backgrounds',
  'song-backgrounds',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users upload song backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users upload song backgrounds" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'song-backgrounds');

DROP POLICY IF EXISTS "Public read song backgrounds" ON storage.objects;
CREATE POLICY "Public read song backgrounds" ON storage.objects
  FOR SELECT USING (bucket_id = 'song-backgrounds');

DROP POLICY IF EXISTS "Authenticated users delete song backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users delete song backgrounds" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'song-backgrounds');
