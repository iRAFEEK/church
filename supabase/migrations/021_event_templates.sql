-- Migration 021: Event templates, template service needs, template segments, and event segments
-- Allows churches to create reusable blueprints for recurring events (e.g. Sunday Service)

-- ============================================================
-- 1. event_templates — reusable event blueprints
-- ============================================================
CREATE TABLE event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  event_type TEXT NOT NULL DEFAULT 'service',
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  location TEXT,
  capacity INTEGER,
  is_public BOOLEAN DEFAULT true,
  registration_required BOOLEAN DEFAULT false,
  notes TEXT,
  notes_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_templates_church ON event_templates(church_id);

-- ============================================================
-- 2. event_template_needs — pre-configured service needs
-- ============================================================
CREATE TABLE event_template_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  volunteers_needed INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  notes_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT template_need_team CHECK (
    (ministry_id IS NOT NULL AND group_id IS NULL) OR
    (ministry_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE INDEX idx_event_template_needs_template ON event_template_needs(template_id);

-- ============================================================
-- 3. event_template_segments — run-of-show blueprint items
-- ============================================================
CREATE TABLE event_template_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  duration_minutes INTEGER,
  ministry_id UUID REFERENCES ministries(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  notes_ar TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_template_segments_template ON event_template_segments(template_id);

-- ============================================================
-- 4. event_segments — per-event run-of-show items
-- ============================================================
CREATE TABLE event_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  duration_minutes INTEGER,
  ministry_id UUID REFERENCES ministries(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  notes_ar TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_segments_event ON event_segments(event_id);

-- ============================================================
-- 5. updated_at triggers
-- ============================================================
CREATE TRIGGER set_event_templates_updated_at
  BEFORE UPDATE ON event_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_event_segments_updated_at
  BEFORE UPDATE ON event_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. RLS policies
-- ============================================================
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_segments ENABLE ROW LEVEL SECURITY;

-- event_templates: members read active; admins CRUD
CREATE POLICY "Members read active templates"
  ON event_templates FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()) AND is_active = true);

CREATE POLICY "Admins manage templates"
  ON event_templates FOR ALL
  USING (church_id IN (
    SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
  ));

-- event_template_needs: follow parent template access
CREATE POLICY "Read template needs"
  ON event_template_needs FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins manage template needs"
  ON event_template_needs FOR ALL
  USING (church_id IN (
    SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
  ));

-- event_template_segments: follow parent template access
CREATE POLICY "Read template segments"
  ON event_template_segments FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins manage template segments"
  ON event_template_segments FOR ALL
  USING (church_id IN (
    SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
  ));

-- event_segments: members read; admins CRUD
CREATE POLICY "Members read event segments"
  ON event_segments FOR SELECT
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins manage event segments"
  ON event_segments FOR ALL
  USING (church_id IN (
    SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
  ));
