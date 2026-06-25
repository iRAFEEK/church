-- Migration 081: per-church privacy control for member CONTACT INFO (phone) in the directory.
--
-- Today the member directory shows phone numbers unconditionally to anyone with
-- the `can_view_members` permission. This adds a per-church setting so each church
-- decides who may see member phone numbers.
--
-- Values:
--   'everyone'      => anyone who can view the directory (can_view_members) sees phone.
--   'leaders_only'  => only ministry_leader + super_admin see phone.
--   'hidden'        => only super_admin sees phone.
--
-- Default 'leaders_only' is privacy-safe and does NOT change behavior for default
-- permission setups: by default only super_admin has can_view_members, so the
-- directory (and phone within it) is already admin-only. super_admin always sees
-- phone regardless of this setting.
--
-- This gates only the DISPLAY/return of phone in the member directory; it does not
-- change the existing can_view_members permission gating for the directory itself.

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS member_directory_visibility TEXT NOT NULL DEFAULT 'leaders_only'
    CHECK (member_directory_visibility IN ('everyone', 'leaders_only', 'hidden'));

COMMENT ON COLUMN churches.member_directory_visibility IS
  'Controls who sees member phone numbers in the directory: everyone (anyone with can_view_members), leaders_only (ministry_leader + super_admin), hidden (super_admin only). Default leaders_only is privacy-safe. super_admin always sees phone.';
