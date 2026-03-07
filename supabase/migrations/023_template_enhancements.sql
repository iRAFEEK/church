-- ============================================================
-- Migration 023: Template Enhancements
-- Adds recurring schedule, custom fields, and role presets
-- ============================================================

-- 1. Recurring schedule on event_templates
ALTER TABLE event_templates
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'none'
    CHECK (recurrence_type IN ('none', 'weekly', 'biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_day INTEGER
    CHECK (recurrence_day IS NULL OR (recurrence_day >= 0 AND recurrence_day <= 6)),
  ADD COLUMN IF NOT EXISTS default_start_time TIME,
  ADD COLUMN IF NOT EXISTS default_end_time TIME;

-- 2. Custom fields on templates, custom field values on events
ALTER TABLE event_templates
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS custom_field_values JSONB DEFAULT '{}'::jsonb;

-- 3. Role presets on template needs and event service needs
ALTER TABLE event_template_needs
  ADD COLUMN IF NOT EXISTS role_presets JSONB DEFAULT '[]'::jsonb;

ALTER TABLE event_service_needs
  ADD COLUMN IF NOT EXISTS role_presets JSONB DEFAULT '[]'::jsonb;
