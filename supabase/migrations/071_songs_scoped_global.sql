-- ============================================================
-- EKKLESIA — Migration 071: Scoped + Global Song Access
-- Songs are visible if: church_id IS NULL (global shared library)
-- OR church_id matches the user's church (their own additions).
-- Churches can add songs (scoped to them), but can't edit global ones.
-- ============================================================

-- 1. RLS: Members read active songs from global library + their own church
DROP POLICY IF EXISTS "Members read active songs" ON songs;
CREATE POLICY "Members read active songs" ON songs
  FOR SELECT USING (
    is_active = true AND (
      church_id IS NULL
      OR church_id IN (
        SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- Leaders read all songs (including inactive) from global + their own church
DROP POLICY IF EXISTS "Leaders read all songs" ON songs;
CREATE POLICY "Leaders read all songs" ON songs
  FOR SELECT USING (
    church_id IS NULL
    OR church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'ministry_leader', 'group_leader')
    )
  );

-- 2. Update search RPC: global + own church, with prefix matching
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
  words TEXT[];
  prefix_query TEXT;
  tsq tsquery;
BEGIN
  words := string_to_array(trim(normalized_query), ' ');
  IF array_length(words, 1) IS NULL THEN
    RETURN;
  END IF;

  IF array_length(words, 1) = 1 THEN
    prefix_query := words[1] || ':*';
  ELSE
    prefix_query := array_to_string(words[1:array_length(words,1)-1], ' & ')
                    || ' & ' || words[array_length(words,1)] || ':*';
  END IF;

  tsq := to_tsquery('simple', prefix_query);

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
$$ LANGUAGE plpgsql STABLE;

-- 3. Make all existing songs global (shared library)
-- New songs added by churches will have their church_id set
UPDATE songs SET church_id = NULL WHERE church_id IS NOT NULL;
