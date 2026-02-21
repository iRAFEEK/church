-- Normalize Arabic alef variants in text_plain so search works regardless of alef type
-- ٱ (alef wasla U+0671), أ (U+0623), إ (U+0625), آ (U+0622) → ا (U+0627)

-- Update strip_tashkeel to also normalize alef variants
CREATE OR REPLACE FUNCTION strip_tashkeel(input TEXT) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Step 1: remove diacritical marks (tashkeel + tatweel)
  result := regexp_replace(
    input,
    '[\u064B-\u065F\u0610-\u061A\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0640]',
    '',
    'g'
  );
  -- Step 2: normalize alef variants to plain alef
  result := replace(result, 'ٱ', 'ا');  -- alef wasla
  result := replace(result, 'أ', 'ا');  -- alef with hamza above
  result := replace(result, 'إ', 'ا');  -- alef with hamza below
  result := replace(result, 'آ', 'ا');  -- alef with madda
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Repopulate text_plain with the improved normalization
UPDATE bible_verses SET text_plain = strip_tashkeel(text);
