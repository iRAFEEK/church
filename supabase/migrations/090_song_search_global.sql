-- Migration 090: song search matches the shared-hymnal READ semantics
--
-- Found live on prod (2026-07-11): all 11,143 hymnal songs are owned by one church
-- (Eldobara), the SELECT RLS is app-wide ("Members read active songs" = any
-- authenticated user), so BROWSE shows the full hymnal to every church — but
-- search_songs_with_snippets internally filtered WHERE (church_id = p_church_id OR
-- church_id IS NULL), so SEARCH returned nothing for every church except the owner.
-- Browse and search must agree: drop the internal church filter and let RLS govern
-- visibility (the function is STABLE, not SECURITY DEFINER, so it runs under the
-- caller's RLS). p_church_id stays in the signature for compatibility.
CREATE OR REPLACE FUNCTION public.search_songs_with_snippets(p_church_id uuid, p_query text, p_locale text DEFAULT 'ar'::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 50)
 RETURNS TABLE(id uuid, title text, title_ar text, artist text, artist_ar text, tags text[], is_active boolean, display_settings jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, lyrics_ar text, lyrics text, snippet text, total_count bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
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
  WHERE true -- visibility governed by RLS (fn runs as caller); browse+search now agree
    AND s.is_active = true
    AND s.search_vector @@ tsq
  ORDER BY ts_rank(s.search_vector, tsq) DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$function$
;
