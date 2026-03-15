-- Migration 056: Add visitor_form_config to churches
-- Allows each church to customize which fields appear on their public visitor registration form.
-- The QR code leads to /join?church=<id>, which reads this config to render the form dynamically.

ALTER TABLE churches
ADD COLUMN IF NOT EXISTS visitor_form_config JSONB NOT NULL DEFAULT '{
  "fields": [
    {"key": "first_name", "required": true, "enabled": true},
    {"key": "last_name", "required": true, "enabled": true},
    {"key": "phone", "enabled": true, "required": false},
    {"key": "email", "enabled": true, "required": false},
    {"key": "age_range", "enabled": true, "required": false},
    {"key": "occupation", "enabled": false, "required": false},
    {"key": "how_heard", "enabled": true, "required": false}
  ]
}'::jsonb;

COMMENT ON COLUMN churches.visitor_form_config IS 'Per-church configuration for the public visitor registration form. Each field has: key (maps to visitors table column), enabled (show/hide), required (validation), optional label/label_ar overrides.';
