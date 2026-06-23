-- ============================================================
-- EKKLESIA — Migration 075: Fix Church-Creator Role Demotion
-- ------------------------------------------------------------
-- The handle_new_user trigger (048) inserts a user_churches row with
-- role 'member' for every new auth user. The church-registration route
-- then tried to INSERT a super_admin row, hit a duplicate, and swallowed
-- the error — so the creator's AUTHORITATIVE per-church role
-- (user_churches.role, used by apiHandler for all privilege checks)
-- stayed 'member', even though profiles.role was correctly super_admin.
--
-- Effect: every church created through the real registration flow had an
-- admin who got 403 on all management actions (create groups, events,
-- ministries, announcements, serving, songs, locations, notifications…).
--
-- The route is fixed to upsert super_admin going forward. This migration
-- backfills the already-affected churches: where a user is super_admin in
-- profiles but not in user_churches for the same church, promote them.
-- ============================================================

UPDATE user_churches uc
SET role = 'super_admin'
FROM profiles p
WHERE p.id = uc.user_id
  AND p.church_id = uc.church_id
  AND p.role = 'super_admin'
  AND uc.role <> 'super_admin';
