-- ============================================================
-- EKKLESIA — Migration 068: Arabic Search Normalization
-- Handles spelling mistakes, hamza variants, tashkeel,
-- taa marbuta, alef maqsura, and similar-sounding letters.
-- ============================================================

-- Full Arabic text normalization for fuzzy search
CREATE OR REPLACE FUNCTION normalize_arabic(input TEXT) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  IF input IS NULL THEN RETURN ''; END IF;

  -- Step 1: remove tashkeel (diacritical marks) and tatweel
  result := regexp_replace(
    input,
    '[\u064B-\u065F\u0610-\u061A\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0640]',
    '',
    'g'
  );

  -- Step 2: normalize alef variants → ا
  result := replace(result, 'ٱ', 'ا');  -- alef wasla
  result := replace(result, 'أ', 'ا');  -- alef with hamza above
  result := replace(result, 'إ', 'ا');  -- alef with hamza below
  result := replace(result, 'آ', 'ا');  -- alef with madda

  -- Step 3: normalize taa marbuta → ه
  result := replace(result, 'ة', 'ه');

  -- Step 4: normalize alef maqsura → ي
  result := replace(result, 'ى', 'ي');

  -- Step 5: normalize hamza variants → remove standalone hamza
  result := replace(result, 'ؤ', 'و');   -- hamza on waw → waw
  result := replace(result, 'ئ', 'ي');   -- hamza on ya → ya
  result := replace(result, 'ء', '');     -- standalone hamza → remove

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Rebuild the search_vector column to use normalized text
-- (Generated columns can't call mutable functions, but IMMUTABLE is fine)
ALTER TABLE songs DROP COLUMN IF EXISTS search_vector;
ALTER TABLE songs ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('simple',
    normalize_arabic(coalesce(title, '') || ' ' ||
    coalesce(title_ar, '') || ' ' ||
    coalesce(artist, '') || ' ' ||
    coalesce(artist_ar, '') || ' ' ||
    coalesce(lyrics, '') || ' ' ||
    coalesce(lyrics_ar, ''))
  )
) STORED;

-- Recreate the GIN index on the new column
DROP INDEX IF EXISTS idx_songs_search;
CREATE INDEX idx_songs_search ON songs USING GIN (search_vector);

-- Update the RPC to normalize the search query too
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
  -- Normalize the search query the same way we normalize the indexed text
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
      -- Use the original query for highlighting (so <mark> tags match the actual text)
      websearch_to_tsquery('simple', p_query),
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
