-- ============================================================
-- Migration 065: Liturgical Resources Module
-- Tables for multi-tradition liturgical content:
-- traditions, categories, sections, content, lectionary readings,
-- hymns, church settings, and user bookmarks.
-- ============================================================

-- ─── Traditions ──────────────────────────────────────────────
CREATE TABLE liturgical_traditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Categories ──────────────────────────────────────────────
CREATE TABLE liturgical_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradition_id UUID NOT NULL REFERENCES liturgical_traditions(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(tradition_id, slug)
);

-- ─── Sections ────────────────────────────────────────────────
CREATE TABLE liturgical_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES liturgical_categories(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE(category_id, slug)
);

-- ─── Content Blocks ──────────────────────────────────────────
CREATE TABLE liturgical_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES liturgical_sections(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL CHECK (content_type IN ('prayer', 'reading', 'response', 'hymn', 'rubric', 'instruction')),
  title TEXT,
  title_ar TEXT,
  body_en TEXT,
  body_ar TEXT,
  body_coptic TEXT,
  audio_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Lectionary Readings (Katameros) ─────────────────────────
CREATE TABLE lectionary_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradition_id UUID NOT NULL REFERENCES liturgical_traditions(id) ON DELETE RESTRICT,
  reading_date DATE NOT NULL,
  coptic_date TEXT,
  season TEXT,
  occasion TEXT,
  occasion_ar TEXT,
  readings JSONB NOT NULL DEFAULT '[]',
  synaxarium_en TEXT,
  synaxarium_ar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tradition_id, reading_date)
);

-- ─── Hymns ───────────────────────────────────────────────────
CREATE TABLE hymns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradition_id UUID NOT NULL REFERENCES liturgical_traditions(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  title_ar TEXT,
  title_coptic TEXT,
  lyrics_en TEXT,
  lyrics_ar TEXT,
  lyrics_coptic TEXT,
  audio_url TEXT,
  season TEXT,
  occasion TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Church Liturgical Settings ──────────────────────────────
CREATE TABLE church_liturgical_settings (
  church_id UUID PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
  tradition_id UUID NOT NULL REFERENCES liturgical_traditions(id) ON DELETE RESTRICT,
  preferred_language TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en', 'coptic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── User Bookmarks ──────────────────────────────────────────
CREATE TABLE liturgical_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  content_id UUID REFERENCES liturgical_content(id) ON DELETE CASCADE,
  hymn_id UUID REFERENCES hymns(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (content_id IS NOT NULL AND hymn_id IS NULL) OR
    (content_id IS NULL AND hymn_id IS NOT NULL)
  )
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_liturgical_categories_tradition ON liturgical_categories(tradition_id, sort_order);
CREATE INDEX idx_liturgical_sections_category ON liturgical_sections(category_id, sort_order);
CREATE INDEX idx_liturgical_content_section ON liturgical_content(section_id, sort_order);
CREATE INDEX idx_lectionary_date ON lectionary_readings(tradition_id, reading_date);
CREATE INDEX idx_hymns_tradition ON hymns(tradition_id, sort_order);
CREATE INDEX idx_hymns_season ON hymns(tradition_id, season) WHERE season IS NOT NULL;
CREATE INDEX idx_hymns_tags ON hymns USING GIN (tags);
CREATE INDEX idx_liturgical_bookmarks_profile ON liturgical_bookmarks(profile_id, church_id);
CREATE INDEX idx_liturgical_bookmarks_content ON liturgical_bookmarks(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX idx_liturgical_bookmarks_hymn ON liturgical_bookmarks(hymn_id) WHERE hymn_id IS NOT NULL;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE liturgical_traditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgical_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgical_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgical_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectionary_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hymns ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_liturgical_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgical_bookmarks ENABLE ROW LEVEL SECURITY;

-- Shared content tables: read-only for all authenticated users
CREATE POLICY "traditions_read" ON liturgical_traditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_read" ON liturgical_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "sections_read" ON liturgical_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "content_read" ON liturgical_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "lectionary_read" ON lectionary_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "hymns_read" ON hymns FOR SELECT TO authenticated USING (true);

-- Service role can insert/update shared content (for sync scripts)
CREATE POLICY "traditions_service_insert" ON liturgical_traditions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "traditions_service_update" ON liturgical_traditions FOR UPDATE TO service_role USING (true);
CREATE POLICY "categories_service_insert" ON liturgical_categories FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "categories_service_update" ON liturgical_categories FOR UPDATE TO service_role USING (true);
CREATE POLICY "sections_service_insert" ON liturgical_sections FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "sections_service_update" ON liturgical_sections FOR UPDATE TO service_role USING (true);
CREATE POLICY "content_service_insert" ON liturgical_content FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "content_service_update" ON liturgical_content FOR UPDATE TO service_role USING (true);
CREATE POLICY "lectionary_service_insert" ON lectionary_readings FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "lectionary_service_update" ON lectionary_readings FOR UPDATE TO service_role USING (true);
CREATE POLICY "hymns_service_insert" ON hymns FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "hymns_service_update" ON hymns FOR UPDATE TO service_role USING (true);

-- Church settings: scoped by church_id
CREATE POLICY "church_settings_read" ON church_liturgical_settings
  FOR SELECT TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "church_settings_insert" ON church_liturgical_settings
  FOR INSERT TO authenticated
  WITH CHECK (church_id IN (
    SELECT church_id FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "church_settings_update" ON church_liturgical_settings
  FOR UPDATE TO authenticated
  USING (church_id IN (
    SELECT church_id FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Bookmarks: scoped by profile_id + church_id
CREATE POLICY "bookmarks_select" ON liturgical_bookmarks
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() AND church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "bookmarks_insert" ON liturgical_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "bookmarks_delete" ON liturgical_bookmarks
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid() AND church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- SEED: Coptic Orthodox tradition + categories
-- ============================================================

INSERT INTO liturgical_traditions (slug, name, name_ar) VALUES
  ('coptic', 'Coptic Orthodox', 'القبطية الأرثوذكسية');

INSERT INTO liturgical_categories (tradition_id, slug, name, name_ar, icon, sort_order)
SELECT t.id, cat.slug, cat.name, cat.name_ar, cat.icon, cat.sort_order
FROM liturgical_traditions t
CROSS JOIN (VALUES
  ('agpeya',    'Agpeya',       'الأجبية',         'BookHeart',   1),
  ('katameros', 'Readings',     'القطمارس',        'BookText',    2),
  ('liturgy',   'Liturgy',      'القداس',          'Church',      3),
  ('psalmody',  'Psalmody',     'الأبصلمودية',     'Music2',      4),
  ('hymns',     'Hymns',        'الألحان',          'Music',       5),
  ('clergy',    'Clergy',       'الكهنوت',          'Crown',       6)
) AS cat(slug, name, name_ar, icon, sort_order)
WHERE t.slug = 'coptic';

-- ─── Agpeya Sections (7 canonical hours) ─────────────────────
INSERT INTO liturgical_sections (category_id, slug, title, title_ar, description, description_ar, sort_order, metadata)
SELECT c.id, s.slug, s.title, s.title_ar, s.description, s.description_ar, s.sort_order, s.metadata::jsonb
FROM liturgical_categories c
CROSS JOIN (VALUES
  ('first-hour',    'First Hour',     'باكر',          'Morning prayer (6 AM)',     'صلاة الساعة الأولى (٦ صباحاً)',     1, '{"hour": 1, "time": "06:00"}'),
  ('third-hour',    'Third Hour',     'الساعة الثالثة', 'Mid-morning prayer (9 AM)', 'صلاة الساعة الثالثة (٩ صباحاً)',    2, '{"hour": 3, "time": "09:00"}'),
  ('sixth-hour',    'Sixth Hour',     'الساعة السادسة', 'Noon prayer (12 PM)',        'صلاة الساعة السادسة (١٢ ظهراً)',   3, '{"hour": 6, "time": "12:00"}'),
  ('ninth-hour',    'Ninth Hour',     'الساعة التاسعة', 'Afternoon prayer (3 PM)',    'صلاة الساعة التاسعة (٣ عصراً)',    4, '{"hour": 9, "time": "15:00"}'),
  ('eleventh-hour', 'Eleventh Hour',  'الساعة الحادية عشرة', 'Sunset prayer (5 PM)', 'صلاة الساعة الحادية عشرة (٥ مساءً)', 5, '{"hour": 11, "time": "17:00"}'),
  ('twelfth-hour',  'Twelfth Hour',   'الساعة الثانية عشرة', 'Night prayer (9 PM)',   'صلاة الساعة الثانية عشرة (٩ مساءً)', 6, '{"hour": 12, "time": "21:00"}'),
  ('midnight',      'Midnight',       'صلاة نصف الليل', 'Midnight prayer',           'صلاة نصف الليل',                    7, '{"hour": 0, "time": "00:00"}')
) AS s(slug, title, title_ar, description, description_ar, sort_order, metadata)
WHERE c.slug = 'agpeya';

-- ─── Liturgy Sections (3 main liturgies) ─────────────────────
INSERT INTO liturgical_sections (category_id, slug, title, title_ar, description, description_ar, sort_order, metadata)
SELECT c.id, s.slug, s.title, s.title_ar, s.description, s.description_ar, s.sort_order, s.metadata::jsonb
FROM liturgical_categories c
CROSS JOIN (VALUES
  ('st-basil',   'Liturgy of St. Basil',    'قداس القديس باسيليوس',     'The most commonly used liturgy',            'القداس الأكثر استخداماً',           1, '{"author": "St. Basil the Great"}'),
  ('st-gregory', 'Liturgy of St. Gregory',  'قداس القديس غريغوريوس',    'Used on major feasts and special occasions', 'يُستخدم في الأعياد الكبرى',        2, '{"author": "St. Gregory of Nazianzus"}'),
  ('st-cyril',   'Liturgy of St. Cyril',    'قداس القديس كيرلس',        'The oldest Coptic liturgy',                 'أقدم قداس قبطي',                  3, '{"author": "St. Cyril I (Mark the Evangelist)"}')
) AS s(slug, title, title_ar, description, description_ar, sort_order, metadata)
WHERE c.slug = 'liturgy';

-- ─── Psalmody Sections ───────────────────────────────────────
INSERT INTO liturgical_sections (category_id, slug, title, title_ar, description, description_ar, sort_order, metadata)
SELECT c.id, s.slug, s.title, s.title_ar, s.description, s.description_ar, s.sort_order, s.metadata::jsonb
FROM liturgical_categories c
CROSS JOIN (VALUES
  ('annual',  'Annual Psalmody',  'الأبصلمودية السنوية',  'Used throughout the year',             'تُستخدم طوال السنة',        1, '{"season": "annual"}'),
  ('kiahk',   'Kiahk Psalmody',   'أبصلمودية كيهك',      'Special psalmody for the month of Kiahk', 'أبصلمودية خاصة بشهر كيهك', 2, '{"season": "kiahk"}')
) AS s(slug, title, title_ar, description, description_ar, sort_order, metadata)
WHERE c.slug = 'psalmody';
