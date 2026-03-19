-- ============================================================
-- Seed: Common Coptic Orthodox Hymns
-- Idempotent: uses ON CONFLICT DO UPDATE
-- Source: Traditional Coptic hymns (public domain liturgical texts)
-- ============================================================

BEGIN;

-- Get the coptic tradition ID
DO $$
DECLARE
  v_tradition_id UUID;
BEGIN
  SELECT id INTO v_tradition_id FROM liturgical_traditions WHERE slug = 'coptic';

  IF v_tradition_id IS NULL THEN
    RAISE EXCEPTION 'Coptic tradition not found. Run migration 065 first.';
  END IF;

  -- ─── Communion Hymns ───────────────────────────────────────
  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000001', v_tradition_id,
     'Psalm 150', 'المزمور ١٥٠', 'Ⲯⲁⲗⲙⲟⲥ ⲣⲛ',
     'هللويا. سبحوا الله في قديسيه. سبحوه في فلك قوته.
سبحوه على مقدرته. سبحوه نظير كثرة عظمته.
سبحوه بصوت البوق. سبحوه بالمزمار والقيثارة.
سبحوه بالدف والرقص. سبحوه بالأوتار والأرغن.
سبحوه بصنوج حسنة السمع. سبحوه بصنوج التهليل.
كل نسمة فلتسبح الرب. هللويا.',
     NULL,
     NULL, 'communion', ARRAY['communion', 'joyful', 'psalm'], 1,
     '{"reference": "Psalm 150"}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    tags = EXCLUDED.tags;

  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000002', v_tradition_id,
     'Eporo', 'إبؤرو', 'Ⲉⲡⲟⲣⲟ',
     'إبؤرو إنتي تي هيريني، ماي نُؤتي إن آليثينوس.
يا ملك السلام، أعطنا سلامك، قرر لنا سلامك، واغفر لنا خطايانا.
فرق أعداء الكنيسة، وحصنها فلا تتزعزع إلى الأبد.
عمانوئيل إلهنا، في وسطنا الآن، بمجد أبيه والروح القدس.
ليباركنا كلنا، ويطهر قلوبنا، ويشفي أمراض نفوسنا وأجسادنا.
نسجد لك أيها المسيح، مع أبيك الصالح والروح القدس، لأنك أتيت وخلصتنا.',
     'Ⲉⲡⲟⲣⲟ ⲛⲧⲉ ϯ ϩⲓⲣⲏⲛⲏ. ⲙⲟⲓ ⲛⲁⲛ ⲛⲧⲉⲕ ϩⲓⲣⲏⲛⲏ.',
     NULL, 'communion', ARRAY['communion', 'peace'], 2,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    lyrics_coptic = EXCLUDED.lyrics_coptic,
    tags = EXCLUDED.tags;

  -- ─── Joyful Hymns ─────────────────────────────────────────
  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000003', v_tradition_id,
     'Tenouosht', 'تين أووشت', 'Ⲧⲉⲛⲟⲩⲱϣⲧ',
     'تين أووشت إمموك أو بي خرستوس نيم بيكيوت إن آغاثوس نيم بي إبنيفما إيثؤواب. جي آكئي آكسوتي إمون.
نسجد لك أيها المسيح مع أبيك الصالح والروح القدس لأنك أتيت وخلصتنا.',
     'Ⲧⲉⲛⲟⲩⲱϣⲧ ⲙⲙⲟⲕ ⲱ Ⲡⲓⲭⲣⲓⲥⲧⲟⲥ ⲛⲉⲙ Ⲡⲉⲕⲓⲱⲧ ⲛⲁⲅⲁⲑⲟⲥ ⲛⲉⲙ Ⲡⲓⲡⲛⲉⲩⲙⲁ ⲉⲑⲟⲩⲁⲃ ϫⲉ ⲁⲕⲓ ⲁⲕⲥⲱϯ ⲙⲙⲟⲛ.',
     NULL, NULL, ARRAY['joyful', 'general'], 3,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    lyrics_coptic = EXCLUDED.lyrics_coptic,
    tags = EXCLUDED.tags;

  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000004', v_tradition_id,
     'Golgotha', 'جلجثة', NULL,
     'جلجثة، جلجثة، جلجثة يا جلجثة.
هناك صُلب يسوع، هناك سال دمه.
هناك فدا البشرية، من عبودية الخطية.
المجد لك يا ربنا يسوع المسيح.
على خشبة الصليب، بسطت يديك يا حبيبي.
تفتح لنا باب الفردوس، يا ابن الله الحبيب.',
     NULL,
     NULL, 'crucifixion', ARRAY['crucifixion', 'lent', 'passion_week'], 4,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    tags = EXCLUDED.tags;

  -- ─── Kiahk Hymns ──────────────────────────────────────────
  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000005', v_tradition_id,
     'Taishori', 'تاي شوري', 'Ⲧⲁⲓϣⲟⲩⲣⲓ',
     'تاي شوري إمبارثينوس، إتاس ميسي نان إمبي إيمي شت.
كل الأجيال والقبائل تمجدك يا أم الله، لأنك ولدت لنا عمانوئيل.
نسألك اذكرينا يا شفيعتنا الأمينة أمام ربنا يسوع المسيح ليغفر لنا خطايانا.',
     'Ⲧⲁⲓϣⲟⲩⲣⲓ ⲙⲡⲁⲣⲑⲉⲛⲟⲥ ⲉⲧⲁⲥⲙⲓⲥⲓ ⲛⲁⲛ ⲙⲡⲓ Ⲉⲙⲙⲁⲛⲟⲩⲏⲗ.',
     'kiahk', 'nativity', ARRAY['kiahk', 'theotokos', 'nativity'], 5,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    lyrics_coptic = EXCLUDED.lyrics_coptic,
    tags = EXCLUDED.tags;

  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000006', v_tradition_id,
     'Agios', 'آجيوس', 'Ⲁⲅⲓⲟⲥ',
     'آجيوس، آجيوس، آجيوس، كيريوس صاباؤوث.
قدوس، قدوس، قدوس، رب الصباؤوت.
السماء والأرض مملوءتان من مجدك الأقدس.
أوصنا في الأعالي. مبارك الآتي باسم الرب. أوصنا في الأعالي.',
     'Ⲁⲅⲓⲟⲥ Ⲁⲅⲓⲟⲥ Ⲁⲅⲓⲟⲥ Ⲕⲩⲣⲓⲟⲥ Ⲥⲁⲃⲁⲱⲑ.',
     NULL, 'liturgy', ARRAY['liturgy', 'trisagion', 'communion'], 6,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    lyrics_coptic = EXCLUDED.lyrics_coptic,
    tags = EXCLUDED.tags;

  -- ─── Resurrection Hymns ───────────────────────────────────
  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000007', v_tradition_id,
     'Khristous Anesti', 'المسيح قام', 'Ⲭⲣⲓⲥⲧⲟⲥ ⲁⲛⲉⲥⲧⲏ',
     'خرستوس آنستي إك نيكرون ثاناتو ثاناتون باتيساس.
المسيح قام من بين الأموات بالموت داس الموت.
والذين في القبور أنعم لهم بالحياة الأبدية.',
     'Ⲭⲣⲓⲥⲧⲟⲥ ⲁⲛⲉⲥⲧⲏ ⲉⲕ ⲛⲉⲕⲣⲱⲛ ⲑⲁⲛⲁⲧⲱ ⲑⲁⲛⲁⲧⲟⲛ ⲡⲁⲧⲏⲥⲁⲥ.',
     'resurrection', 'easter', ARRAY['resurrection', 'easter', 'joyful'], 7,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    lyrics_coptic = EXCLUDED.lyrics_coptic,
    tags = EXCLUDED.tags;

  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000008', v_tradition_id,
     'Ekhon Emparadiso', 'إكون إمباراذيسو', 'Ⲉⲭⲟⲛ ⲉⲙⲡⲁⲣⲁⲇⲓⲥⲟ',
     'عوضا عن الفردوس صار لنا السماء.
عوضا عن شجرة المعرفة أُعطي لنا خشبة الصليب.
عوضا عن الموت أُعطيت لنا الحياة الأبدية.
عوضا عن آدم أتى المسيح لنا.',
     NULL,
     'resurrection', NULL, ARRAY['resurrection', 'joyful'], 8,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    tags = EXCLUDED.tags;

  -- ─── General / Year-round Hymns ───────────────────────────
  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000009', v_tradition_id,
     'Hiten ni Efsheios', 'هيتين ني إفشويس', 'Ϩⲓⲧⲉⲛ ⲛⲓⲉⲩⲭⲏ',
     'بصلوات والدة الإله القديسة مريم، يا رب أنعم لنا بمغفرة خطايانا.
نسجد لك أيها المسيح مع أبيك الصالح والروح القدس لأنك أتيت وخلصتنا.
يا كل الطغمات السمائية اطلبوا من الرب عنا ليغفر لنا خطايانا.',
     'Ϩⲓⲧⲉⲛ ⲛⲓ ⲉⲩⲭⲏ ⲛⲧⲉ ϯ ⲑⲉⲟⲧⲟⲕⲟⲥ ⲉⲑⲟⲩⲁⲃ Ⲙⲁⲣⲓⲁ. Ⲡϭⲟⲓⲥ ⲁⲣⲓ ϩⲙⲟⲧ ⲛⲁⲛ ⲙⲡⲓⲭⲱ ⲉⲃⲟⲗ ⲛⲧⲉ ⲛⲉⲛⲛⲟⲃⲓ.',
     NULL, NULL, ARRAY['general', 'theotokos', 'intercession'], 9,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    lyrics_coptic = EXCLUDED.lyrics_coptic,
    tags = EXCLUDED.tags;

  INSERT INTO hymns (id, tradition_id, title, title_ar, title_coptic, lyrics_ar, lyrics_coptic, season, occasion, tags, sort_order, metadata)
  VALUES
    ('30000000-0000-0000-0000-000000000010', v_tradition_id,
     'Tai Shori (Sunday Theotokia)', 'تاي شوري (ثيؤطوكية الأحد)', NULL,
     'السلام لك يا مريم، الحمامة الحسنة، التي ولدت لنا الله الكلمة.
السلام لك يا مريم، سلام مقدس، سلام والدة الإله.
السلام لك يا مريم، أم القدوس، السلام لأم الله.',
     NULL,
     NULL, 'sunday', ARRAY['theotokos', 'sunday', 'general'], 10,
     '{}')
  ON CONFLICT (id) DO UPDATE SET
    lyrics_ar = EXCLUDED.lyrics_ar,
    tags = EXCLUDED.tags;

END $$;

COMMIT;
