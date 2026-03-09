-- Migration 024: Granular Permissions System
-- Adds per-user permission overrides, configurable role defaults,
-- audit logging, serving area leaders, and event visibility targeting.

-- ================================================================
-- 1. Permissions JSONB on profiles (NULL = use role defaults only)
-- ================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

-- ================================================================
-- 2. Configurable role defaults per church
-- ================================================================
CREATE TABLE IF NOT EXISTS role_permission_defaults (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(church_id, role)
);

ALTER TABLE role_permission_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permission_defaults_read"
  ON role_permission_defaults FOR SELECT
  TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "role_permission_defaults_write"
  ON role_permission_defaults FOR ALL
  TO authenticated
  USING (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ================================================================
-- 3. Permission audit log
-- ================================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  changed_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  target_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_role  user_role,
  change_type  TEXT NOT NULL, -- 'user_override' | 'role_default'
  old_value    JSONB,
  new_value    JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permission_audit_log_read"
  ON permission_audit_log FOR SELECT
  TO authenticated
  USING (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "permission_audit_log_insert"
  ON permission_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    church_id IN (
      SELECT church_id FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ================================================================
-- 4. Serving area leaders (multiple per area)
-- ================================================================
CREATE TABLE IF NOT EXISTS serving_area_leaders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serving_area_id UUID NOT NULL REFERENCES serving_areas(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(serving_area_id, profile_id)
);

ALTER TABLE serving_area_leaders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "serving_area_leaders_read"
  ON serving_area_leaders FOR SELECT
  TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "serving_area_leaders_write"
  ON serving_area_leaders FOR ALL
  TO authenticated
  USING (
    church_id IN (
      SELECT church_id FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
    )
    OR
    (serving_area_id IN (
      SELECT serving_area_id FROM serving_area_leaders WHERE profile_id = auth.uid()
    ))
  );

-- ================================================================
-- 5. Event visibility
-- ================================================================
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS hide_from_non_invited BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS event_visibility_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('ministry', 'group')),
  target_id   UUID NOT NULL,
  UNIQUE(event_id, target_type, target_id)
);

ALTER TABLE event_visibility_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_visibility_targets_read"
  ON event_visibility_targets FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "event_visibility_targets_write"
  ON event_visibility_targets FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE church_id IN (
        SELECT church_id FROM profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'ministry_leader')
      )
    )
  );

-- ================================================================
-- 6. Indexes
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_perm_audit_church ON permission_audit_log(church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_profile ON serving_area_leaders(profile_id);
CREATE INDEX IF NOT EXISTS idx_sal_area ON serving_area_leaders(serving_area_id);
CREATE INDEX IF NOT EXISTS idx_evt_vis_event ON event_visibility_targets(event_id);
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON profiles(church_id) WHERE permissions IS NOT NULL;
