-- ============================================================
-- EKKLESIA — 016: Add denomination to churches
-- ============================================================

ALTER TABLE churches ADD COLUMN IF NOT EXISTS denomination TEXT;
