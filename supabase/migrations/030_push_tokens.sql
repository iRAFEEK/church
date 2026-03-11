-- Add 'push' as a notification channel
ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'push';

-- Push token registry: one row per user per browser/device
CREATE TABLE IF NOT EXISTS push_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  device_hint   TEXT,               -- e.g. 'Chrome/macOS', 'Safari/iOS' — informational only
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_profile ON push_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_church  ON push_tokens(church_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users manage own push tokens" ON push_tokens
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Service role can read all tokens (for server-side FCM sends)
CREATE POLICY "Service role read push tokens" ON push_tokens
  FOR SELECT
  USING (true);
