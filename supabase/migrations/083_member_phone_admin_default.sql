-- Migration: default member-directory visibility to 'hidden' (administrators only)
--
-- CEO decision (2026-06-25): member phone numbers should be ADMIN-ONLY by default.
-- Leaders get access only when a super_admin grants them the per-user
-- `can_view_member_phone` permission (handled in the permission system, not here).
--
-- This changes the default set in migration 081 ('leaders_only' -> 'hidden') and
-- migrates existing churches still on the old default. (Pre-launch; no church has
-- intentionally chosen 'leaders_only' yet.)

ALTER TABLE public.churches
  ALTER COLUMN member_directory_visibility SET DEFAULT 'hidden';

UPDATE public.churches
  SET member_directory_visibility = 'hidden'
  WHERE member_directory_visibility = 'leaders_only';
