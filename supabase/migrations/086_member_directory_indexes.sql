-- ============================================================
-- 086 — Member-directory + attendance scaling indexes
--
-- Source: the 30-church / 9,093-member load simulation. It found the most-used
-- admin queries — the member directory (list, search, count) and the "at-risk"
-- and attendance-rollup views — do a SEQUENTIAL SCAN of the whole table, because
-- the only church_id index on `profiles` is PARTIAL (idx_profiles_permissions,
-- WHERE permissions IS NOT NULL) and never covers the general church-scoped query.
--
-- Harmless at pilot scale (~1 ms on 9k rows) but it degrades LINEARLY: a single
-- church reaching a few thousand members turns every directory page load into a
-- full-table scan. These three btree indexes serve the filter + sort directly.
--
-- NOTE ON `CONCURRENTLY`: this migration uses plain CREATE INDEX because migration
-- runners execute inside a transaction (where CONCURRENTLY is illegal) and, on a
-- clean prod rebuild, the tables are empty so the build is instant. To add these
-- to an ALREADY-POPULATED production table without locking writes, run the
-- CONCURRENTLY form manually, outside a transaction, e.g.:
--   CREATE INDEX CONCURRENTLY idx_profiles_church_created
--     ON profiles (church_id, created_at DESC);
-- ============================================================

-- 1. Member directory: church-scoped list, default-sorted by newest.
--    Serves `WHERE church_id = $1 ORDER BY created_at DESC LIMIT n`, plus the
--    church_id filter for search and exact-count queries.
CREATE INDEX IF NOT EXISTS idx_profiles_church_created
  ON public.profiles (church_id, created_at DESC);

-- 2. Status-filtered views: "at-risk" / active / inactive member lists and the
--    dashboard "needs attention" counts. Serves `WHERE church_id = $1 AND status = $2`.
CREATE INDEX IF NOT EXISTS idx_profiles_church_status
  ON public.profiles (church_id, status);

-- 3. Church-level attendance rollups (dashboard attendance-rate aggregate).
--    `attendance` grows fastest of any table and had NO church_id index at all;
--    per-member and per-gathering lookups were already covered.
CREATE INDEX IF NOT EXISTS idx_attendance_church_status
  ON public.attendance (church_id, status);
