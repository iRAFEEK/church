-- Migration: Multi-church membership support
-- Allows users to belong to multiple churches with a church-picker at login.
-- Existing single-church model is preserved via profiles.church_id (active church).

-- ─── user_churches junction table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_churches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id  UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, church_id)
);

ALTER TABLE public.user_churches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_churches_user_id   ON public.user_churches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_churches_church_id ON public.user_churches(church_id);

-- RLS: users manage their own memberships
CREATE POLICY "user_churches: own select"
  ON public.user_churches FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_churches: own insert"
  ON public.user_churches FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_churches: own delete"
  ON public.user_churches FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Super admins can see all members of their church
CREATE POLICY "user_churches: admin select"
  ON public.user_churches FOR SELECT TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() IN ('super_admin', 'ministry_leader')
  );

-- ─── churches: allow authenticated users to search all active churches ─────────
-- (churches table only contains public info: name, logo, country — no member data)

CREATE POLICY "churches: authenticated search"
  ON public.churches FOR SELECT TO authenticated
  USING (is_active = true);

-- ─── Backfill: populate user_churches from existing profiles ──────────────────

INSERT INTO public.user_churches (user_id, church_id, role)
SELECT id, church_id, role
FROM public.profiles
WHERE church_id IS NOT NULL
ON CONFLICT (user_id, church_id) DO NOTHING;
