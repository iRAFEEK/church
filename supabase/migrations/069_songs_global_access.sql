-- ============================================================
-- EKKLESIA — Migration 069: Global Song Access
-- Makes all songs readable across all churches.
-- Songs are a shared hymnal — any authenticated user can read.
-- Create/update/delete remain scoped to the song's own church.
-- ============================================================

-- 1. RLS: Any authenticated user can read active songs from any church
DROP POLICY IF EXISTS "Members read active songs" ON songs;
CREATE POLICY "Members read active songs" ON songs
  FOR SELECT USING (
    is_active = true AND auth.uid() IS NOT NULL
  );

-- Leaders can read all songs (including inactive) globally
DROP POLICY IF EXISTS "Leaders read all songs" ON songs;
CREATE POLICY "Leaders read all songs" ON songs
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'ministry_leader', 'group_leader')
    )
  );

-- 2. Update search RPC to not filter by church_id
CREATE OR REPLACE FUNCTION search_songs_with_snippets(
  p_church_id UUID,
  p_query TEXT,
  p_locale TEXT DEFAULT 'ar',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  title_ar TEXT,
  artist TEXT,
  artist_ar TEXT,
  tags TEXT[],
  is_active BOOLEAN,
  display_settings JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  lyrics_ar TEXT,
  lyrics TEXT,
  snippet TEXT,
  total_count BIGINT
) AS $$
DECLARE
  normalized_query TEXT := normalize_arabic(p_query);
  tsq tsquery := websearch_to_tsquery('simple', normalized_query);
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.title, s.title_ar, s.artist, s.artist_ar,
    s.tags, s.is_active, s.display_settings,
    s.created_at, s.updated_at,
    s.lyrics_ar, s.lyrics,
    ts_headline('simple',
      COALESCE(CASE WHEN p_locale LIKE 'ar%' THEN s.lyrics_ar ELSE s.lyrics END,
               COALESCE(s.title_ar, s.title)),
      websearch_to_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=8, MaxFragments=1'
    ) AS snippet,
    COUNT(*) OVER() AS total_count
  FROM songs s
  WHERE s.is_active = true
    AND s.search_vector @@ tsq
  ORDER BY ts_rank(s.search_vector, tsq) DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql STABLE;
