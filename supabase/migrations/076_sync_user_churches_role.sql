-- ============================================================
-- EKKLESIA — Migration 076: Keep user_churches.role in sync with profiles.role
-- ------------------------------------------------------------
-- THE ROOT CAUSE (systemic):
--   apiHandler treats user_churches.role as the AUTHORITATIVE per-church role
--   for all privilege checks. But the write paths that change a person's role
--   (church registration, leader registration, promote-member-to-leader, the
--   member role editor) update profiles.role and frequently DO NOT update
--   user_churches.role. The handle_new_user trigger (048) seeds user_churches
--   with 'member'. Net effect: newly created admins/leaders are silently
--   demoted to 'member' and get 403 on everything they should manage.
--
--   Migration 075 patched the super_admin case for church creators; this
--   migration fixes the problem at the source for ALL roles and ALL write
--   paths via a trigger, plus a complete one-time backfill.
-- ============================================================

-- 1. Trigger: whenever profiles.role is set/changed, mirror it into the
--    authoritative user_churches row for that (user, church).
CREATE OR REPLACE FUNCTION public.sync_user_churches_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_churches (user_id, church_id, role)
  VALUES (NEW.id, NEW.church_id, NEW.role)
  ON CONFLICT (user_id, church_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_user_churches_role ON public.profiles;
CREATE TRIGGER trg_sync_user_churches_role
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_churches_role();

-- 2. Backfill: fix every existing mismatch...
UPDATE user_churches uc
SET role = p.role
FROM profiles p
WHERE p.id = uc.user_id
  AND p.church_id = uc.church_id
  AND uc.role <> p.role;

-- ...and create the missing user_churches rows for profiles that never got one
-- (e.g. churches registered before the handle_new_user trigger existed).
INSERT INTO user_churches (user_id, church_id, role)
SELECT p.id, p.church_id, p.role
FROM profiles p
LEFT JOIN user_churches uc
  ON uc.user_id = p.id AND uc.church_id = p.church_id
WHERE uc.user_id IS NULL
ON CONFLICT (user_id, church_id) DO NOTHING;
