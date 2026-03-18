-- ============================================================
-- EKKLESIA — Migration 067: Song Search with Snippets RPC
-- Provides full-text search with ts_headline snippets for
-- fast worship song lookup with lyrics context.
-- ============================================================

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
  tsq tsquery := websearch_to_tsquery('simple', p_query);
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
      tsq,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=8, MaxFragments=1'
    ) AS snippet,
    COUNT(*) OVER() AS total_count
  FROM songs s
  WHERE (s.church_id = p_church_id OR s.church_id IS NULL)
    AND s.is_active = true
    AND s.search_vector @@ tsq
  ORDER BY ts_rank(s.search_vector, tsq) DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
