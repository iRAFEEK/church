-- ============================================================
-- Migration 029: Feature Flags
-- ARCH: Per-church feature toggles for gradual rollout.
-- Allows enabling features for specific churches without code deployment.
-- ============================================================

CREATE TABLE IF NOT EXISTS church_features (
  church_id uuid REFERENCES churches(id) ON DELETE CASCADE,
  feature text NOT NULL,
  enabled boolean DEFAULT false,
  enabled_at timestamptz,
  PRIMARY KEY (church_id, feature)
);

ALTER TABLE church_features ENABLE ROW LEVEL SECURITY;

-- Any church member can read their church's feature flags
CREATE POLICY "members_read_features" ON church_features
  FOR SELECT USING (
    church_id IN (
      SELECT p.church_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- Only super admins can manage feature flags
CREATE POLICY "admins_manage_features" ON church_features
  FOR ALL USING (
    church_id IN (
      SELECT p.church_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );
