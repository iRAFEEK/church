-- Allow standalone action items (not tied to a meeting).
-- meeting_id becomes nullable so items can exist independently on the ministry page.

ALTER TABLE ministry_action_items ALTER COLUMN meeting_id DROP NOT NULL;

-- Index for fetching all open items per ministry (standalone + meeting-linked)
CREATE INDEX IF NOT EXISTS idx_ministry_action_items_ministry_status
  ON ministry_action_items (ministry_id, status) WHERE status = 'open';
