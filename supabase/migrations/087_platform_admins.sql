-- Migration 087: platform_admins — DB-managed allowlist of Ekklesia platform operators
--
-- Ekklesia's normal roles are per-church. A *platform* admin (the people running the
-- SaaS — they approve brand-new churches they aren't a member of) is identified purely
-- by email. Until now that list lived ONLY in the PLATFORM_ADMIN_EMAILS env var, so
-- granting a colleague approval rights meant a redeploy.
--
-- This table lets a platform admin add/remove approver emails from the UI at runtime.
-- The env var stays the un-removable BOOTSTRAP owner (see lib/platform.ts): the app
-- treats "email in PLATFORM_ADMIN_EMAILS OR row in platform_admins" as a platform admin,
-- so the founder can never be locked out even if the table is emptied.
--
-- Access model: NO direct client access. RLS is enabled with no policies, which denies
-- all anon/authenticated reads/writes; every read/write goes through the service-role
-- client in app/api/platform/* (itself gated by isPlatformAdmin). The service role
-- bypasses RLS. Emails are stored normalized (lowercase) — enforced in app code.

CREATE TABLE IF NOT EXISTS public.platform_admins (
  email      TEXT PRIMARY KEY,
  added_by   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_admins IS
  'Ekklesia platform operators who can approve pending churches and manage this list. Email-based (lowercase), checked alongside the PLATFORM_ADMIN_EMAILS env bootstrap owner. Access only via the service-role client in app/api/platform/*.';

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: deny all for anon/authenticated. Service role bypasses RLS.
