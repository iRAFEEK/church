-- Migration 089: allow ANON search of active churches (fixes broken logged-out /signup)
--
-- Found live on staging (2026-07-11) and confirmed on prod: /signup runs logged OUT, but its
-- church picker calls /api/churches/search, which (a) the middleware redirected to /login and
-- (b) RLS only allowed via "churches: authenticated search" (031, TO authenticated). Net effect:
-- a brand-new visitor could never find a church to join — the self-signup door was dead.
--
-- The churches table exposes only public directory info here (name, name_ar, country, logo,
-- denomination) and the route narrows columns + filters is_active. Mirror the authenticated
-- policy for anon, restricted to ACTIVE churches (pending/rejected stay invisible).

CREATE POLICY "churches: anon search"
  ON public.churches FOR SELECT TO anon
  USING (is_active = true);
