-- P0-2: Fix push_tokens SELECT policy — was USING(true), now scoped to own tokens
-- P0-3: Fix notifications_log INSERT policy — was WITH CHECK(true), now scoped

-- ============================================================
-- P0-2: push_tokens — any authenticated user could read ALL FCM tokens
-- Fix: restrict SELECT to own tokens only
-- ============================================================

DROP POLICY IF EXISTS "Users can view push tokens" ON push_tokens;

CREATE POLICY "Users can view own push tokens"
  ON push_tokens
  FOR SELECT
  USING (profile_id = auth.uid());

-- ============================================================
-- P0-3: notifications_log — any authenticated user could inject
-- fake notifications into any user's feed in any church
-- Fix: remove permissive INSERT; server-side uses service role
-- If client INSERT is ever needed, scope to own church + own user
-- ============================================================

DROP POLICY IF EXISTS "Users can create notifications" ON notifications_log;

-- Only allow inserting notifications for yourself in your own church
CREATE POLICY "Users can create own notifications"
  ON notifications_log
  FOR INSERT
  WITH CHECK (
    church_id = get_church_id()
    AND profile_id = auth.uid()
  );
