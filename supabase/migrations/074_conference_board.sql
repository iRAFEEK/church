-- ============================================================
-- 074: Conference Planning Board
-- Adds visual drag-and-drop planning board:
-- conference_board_columns, conference_board_cards,
-- conference_collaborators
-- Also adds card_id FK to conference_tasks and conference_resources
-- ============================================================

-- ─── 1. Board Columns (rooms/stages) ─────────────────────────

CREATE TABLE IF NOT EXISTS conference_board_columns (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  UUID        NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  event_id   UUID        NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  name_ar    TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conf_board_cols_event  ON conference_board_columns (event_id, sort_order);
CREATE INDEX idx_conf_board_cols_church ON conference_board_columns (church_id);

CREATE TRIGGER set_conf_board_cols_updated_at
  BEFORE UPDATE ON conference_board_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conference_board_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can view board columns"
  ON conference_board_columns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.church_id = conference_board_columns.church_id
  ));

CREATE POLICY "Admins can manage board columns"
  ON conference_board_columns FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_board_columns.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- ─── 2. Board Cards (ministry units) ─────────────────────────

CREATE TABLE IF NOT EXISTS conference_board_cards (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                   UUID        NOT NULL REFERENCES churches(id)                 ON DELETE CASCADE,
  event_id                    UUID        NOT NULL REFERENCES events(id)                   ON DELETE CASCADE,
  column_id                   UUID        NOT NULL REFERENCES conference_board_columns(id) ON DELETE CASCADE,
  ministry_id                 UUID        REFERENCES ministries(id)  ON DELETE SET NULL,
  custom_name                 TEXT,
  custom_name_ar              TEXT,
  assigned_leader_id          UUID        REFERENCES profiles(id)    ON DELETE SET NULL,
  assigned_leader_external_phone TEXT,
  headcount_target            INTEGER,
  status                      TEXT        NOT NULL DEFAULT 'planning'
                              CHECK (status IN ('planning','leader_notified','in_progress','ready')),
  sort_order                  INTEGER     NOT NULL DEFAULT 0,
  leader_notified_at          TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_card_has_name CHECK (
    ministry_id IS NOT NULL OR custom_name IS NOT NULL
  )
);

CREATE INDEX idx_conf_board_cards_event   ON conference_board_cards (event_id);
CREATE INDEX idx_conf_board_cards_column  ON conference_board_cards (column_id, sort_order);
CREATE INDEX idx_conf_board_cards_leader  ON conference_board_cards (assigned_leader_id);
CREATE INDEX idx_conf_board_cards_church  ON conference_board_cards (church_id);

ALTER TABLE conference_board_cards REPLICA IDENTITY FULL;

CREATE TRIGGER set_conf_board_cards_updated_at
  BEFORE UPDATE ON conference_board_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conference_board_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members can view board cards"
  ON conference_board_cards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.church_id = conference_board_cards.church_id
  ));

CREATE POLICY "Admins can manage board cards"
  ON conference_board_cards FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_board_cards.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- Assigned ministry leader can update their own card
CREATE POLICY "Assigned leader can update their card"
  ON conference_board_cards FOR UPDATE
  USING (assigned_leader_id = auth.uid())
  WITH CHECK (assigned_leader_id = auth.uid());

-- ─── 3. Conference Collaborators ─────────────────────────────

CREATE TABLE IF NOT EXISTS conference_collaborators (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id             UUID        NOT NULL REFERENCES churches(id)              ON DELETE CASCADE,
  event_id              UUID        NOT NULL REFERENCES events(id)                ON DELETE CASCADE,
  card_id               UUID        REFERENCES conference_board_cards(id)         ON DELETE CASCADE,
  -- NULL card_id = board-level co-planner (sees full board)
  -- non-NULL card_id = ministry-scoped (sees only their card)
  invited_by            UUID        NOT NULL REFERENCES profiles(id)              ON DELETE CASCADE,
  user_id               UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  external_email        TEXT,
  external_phone        TEXT,
  external_church_name  TEXT,
  role                  TEXT        NOT NULL DEFAULT 'co_planner'
                        CHECK (role IN ('co_planner','ministry_lead')),
  invite_token          TEXT        UNIQUE,
  accepted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conf_collaborators_event   ON conference_collaborators (event_id);
CREATE INDEX idx_conf_collaborators_user    ON conference_collaborators (user_id);
CREATE INDEX idx_conf_collaborators_token   ON conference_collaborators (invite_token);
CREATE INDEX idx_conf_collaborators_card    ON conference_collaborators (card_id);

ALTER TABLE conference_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church admins can manage collaborators"
  ON conference_collaborators FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = conference_collaborators.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

CREATE POLICY "Collaborators can view their own invites"
  ON conference_collaborators FOR SELECT
  USING (user_id = auth.uid());

-- ─── 4. Add card_id FK to conference_tasks ───────────────────

ALTER TABLE conference_tasks
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES conference_board_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conf_tasks_card ON conference_tasks (card_id);

-- Update the scope constraint to allow card_id as valid scope
ALTER TABLE conference_tasks DROP CONSTRAINT IF EXISTS chk_task_scope;
ALTER TABLE conference_tasks ADD CONSTRAINT chk_task_scope CHECK (
  team_id IS NOT NULL OR area_id IS NOT NULL OR card_id IS NOT NULL
);

-- ─── 5. Add card_id FK to conference_resources ───────────────

ALTER TABLE conference_resources
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES conference_board_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conf_resources_card ON conference_resources (card_id);

-- Update the scope constraint
ALTER TABLE conference_resources DROP CONSTRAINT IF EXISTS chk_resource_scope;
ALTER TABLE conference_resources ADD CONSTRAINT chk_resource_scope CHECK (
  team_id IS NOT NULL OR card_id IS NOT NULL
);

-- ─── 6. RLS for card-scoped tasks/resources ──────────────────

-- Ministry leaders assigned to a card can view/manage card-scoped tasks
CREATE POLICY "Card leaders can view card tasks"
  ON conference_tasks FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM conference_board_cards WHERE assigned_leader_id = auth.uid()
    )
  );

CREATE POLICY "Card leaders can manage card tasks"
  ON conference_tasks FOR ALL
  USING (
    card_id IN (
      SELECT id FROM conference_board_cards WHERE assigned_leader_id = auth.uid()
    )
  );

-- Collaborators (ministry_lead scoped to a card) can view/manage
CREATE POLICY "Collaborators can view their card tasks"
  ON conference_tasks FOR SELECT
  USING (
    card_id IN (
      SELECT card_id FROM conference_collaborators
      WHERE user_id = auth.uid() AND card_id IS NOT NULL AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Card leaders can view card resources"
  ON conference_resources FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM conference_board_cards WHERE assigned_leader_id = auth.uid()
    )
  );

CREATE POLICY "Card leaders can manage card resources"
  ON conference_resources FOR ALL
  USING (
    card_id IN (
      SELECT id FROM conference_board_cards WHERE assigned_leader_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can view their card resources"
  ON conference_resources FOR SELECT
  USING (
    card_id IN (
      SELECT card_id FROM conference_collaborators
      WHERE user_id = auth.uid() AND card_id IS NOT NULL AND accepted_at IS NOT NULL
    )
  );
