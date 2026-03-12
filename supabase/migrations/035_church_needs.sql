-- ============================================================
-- 035: Church Needs — Cross-Church Marketplace
-- ============================================================

-- Enums
CREATE TYPE public.need_urgency AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.need_status AS ENUM ('open', 'in_progress', 'fulfilled', 'closed');
CREATE TYPE public.need_category AS ENUM (
  'furniture', 'electronics', 'supplies', 'food', 'clothing',
  'building', 'vehicle', 'educational', 'medical', 'financial',
  'volunteer', 'other'
);
CREATE TYPE public.need_response_status AS ENUM ('pending', 'accepted', 'declined', 'completed');

-- ─── church_needs ────────────────────────────────────────────
CREATE TABLE public.church_needs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  title         TEXT NOT NULL,
  title_ar      TEXT,
  description   TEXT,
  description_ar TEXT,
  image_url     TEXT,
  category      public.need_category NOT NULL DEFAULT 'other',
  quantity      INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  urgency       public.need_urgency NOT NULL DEFAULT 'medium',
  status        public.need_status NOT NULL DEFAULT 'open',
  contact_name  TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  expires_at    TIMESTAMPTZ,
  fulfilled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_church_needs_church     ON public.church_needs(church_id);
CREATE INDEX idx_church_needs_category   ON public.church_needs(category);
CREATE INDEX idx_church_needs_urgency    ON public.church_needs(urgency);
CREATE INDEX idx_church_needs_status     ON public.church_needs(status);
CREATE INDEX idx_church_needs_created    ON public.church_needs(created_at DESC);

CREATE TRIGGER church_needs_updated_at
  BEFORE UPDATE ON public.church_needs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── church_need_responses ───────────────────────────────────
CREATE TABLE public.church_need_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id             UUID NOT NULL REFERENCES public.church_needs(id) ON DELETE CASCADE,
  responder_church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  responder_user_id   UUID NOT NULL REFERENCES auth.users(id),
  message             TEXT NOT NULL,
  message_ar          TEXT,
  status              public.need_response_status NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (need_id, responder_church_id)
);

CREATE INDEX idx_church_need_responses_need      ON public.church_need_responses(need_id);
CREATE INDEX idx_church_need_responses_responder  ON public.church_need_responses(responder_church_id);

CREATE TRIGGER church_need_responses_updated_at
  BEFORE UPDATE ON public.church_need_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RLS: church_needs (cross-church reads) ──────────────────
ALTER TABLE public.church_needs ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read non-closed needs (cross-church)
CREATE POLICY "Authenticated users read open needs"
  ON public.church_needs FOR SELECT TO authenticated
  USING (
    status != 'closed' OR church_id = public.get_church_id()
  );

-- Only own church can insert needs
CREATE POLICY "Church admins insert own needs"
  ON public.church_needs FOR INSERT TO authenticated
  WITH CHECK (
    church_id = public.get_church_id()
  );

-- Only own church can update needs
CREATE POLICY "Church admins update own needs"
  ON public.church_needs FOR UPDATE TO authenticated
  USING (church_id = public.get_church_id())
  WITH CHECK (church_id = public.get_church_id());

-- Only own church super_admin can delete
CREATE POLICY "Super admin deletes own needs"
  ON public.church_needs FOR DELETE TO authenticated
  USING (
    church_id = public.get_church_id()
    AND public.get_user_role() = 'super_admin'
  );

-- ─── RLS: church_need_responses ──────────────────────────────
ALTER TABLE public.church_need_responses ENABLE ROW LEVEL SECURITY;

-- Either the need-owner church or the responder church can read
CREATE POLICY "Both parties read responses"
  ON public.church_need_responses FOR SELECT TO authenticated
  USING (
    responder_church_id = public.get_church_id()
    OR need_id IN (SELECT id FROM public.church_needs WHERE church_id = public.get_church_id())
  );

-- Responder church inserts their own response
CREATE POLICY "Responder inserts response"
  ON public.church_need_responses FOR INSERT TO authenticated
  WITH CHECK (
    responder_church_id = public.get_church_id()
  );

-- Need-owner church can update response status (accept/decline)
CREATE POLICY "Need owner updates response status"
  ON public.church_need_responses FOR UPDATE TO authenticated
  USING (
    need_id IN (SELECT id FROM public.church_needs WHERE church_id = public.get_church_id())
  )
  WITH CHECK (
    need_id IN (SELECT id FROM public.church_needs WHERE church_id = public.get_church_id())
  );

-- Responder can withdraw (delete) their own response
CREATE POLICY "Responder deletes own response"
  ON public.church_need_responses FOR DELETE TO authenticated
  USING (
    responder_church_id = public.get_church_id()
  );

-- ─── Storage bucket ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('church-needs', 'church-needs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users upload need images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'church-needs');

CREATE POLICY "Public reads need images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'church-needs');

CREATE POLICY "Users delete own need images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'church-needs' AND (auth.uid())::text = (storage.foldername(name))[1]);
