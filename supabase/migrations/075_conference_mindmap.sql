-- Migration 075: Conference Mind Map
-- Adds team_id FK to conference_board_cards so cards can be linked directly to teams
-- (the new mind map renders the conference_areas + conference_teams tree natively)

-- Add team_id FK to conference_board_cards
ALTER TABLE conference_board_cards
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES conference_teams(id) ON DELETE SET NULL;

-- Make column_id nullable (was required for the old kanban; now optional since we use team_id)
ALTER TABLE conference_board_cards
  ALTER COLUMN column_id DROP NOT NULL;

-- Index for team-scoped card queries
CREATE INDEX IF NOT EXISTS idx_conf_board_cards_team
  ON conference_board_cards (team_id)
  WHERE team_id IS NOT NULL;
