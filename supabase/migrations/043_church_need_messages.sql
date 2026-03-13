-- ============================================================
-- 043: Church Need Messages — threaded messaging between churches on a response
-- ============================================================

CREATE TABLE public.church_need_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id     UUID NOT NULL REFERENCES public.church_need_responses(id) ON DELETE CASCADE,
  sender_user_id  UUID NOT NULL REFERENCES auth.users(id),
  sender_church_id UUID NOT NULL REFERENCES public.churches(id),
  message         TEXT NOT NULL,
  message_ar      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_church_need_messages_response ON public.church_need_messages(response_id, created_at);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE public.church_need_messages ENABLE ROW LEVEL SECURITY;

-- Both parties (need owner + responder) can read messages
CREATE POLICY "Both parties read messages"
  ON public.church_need_messages FOR SELECT TO authenticated
  USING (
    response_id IN (
      SELECT r.id FROM public.church_need_responses r
      WHERE r.responder_church_id = public.get_church_id()
      UNION
      SELECT r.id FROM public.church_need_responses r
        JOIN public.church_needs n ON n.id = r.need_id
      WHERE n.church_id = public.get_church_id()
    )
  );

-- Both parties can send messages
CREATE POLICY "Both parties insert messages"
  ON public.church_need_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_church_id = public.get_church_id()
    AND response_id IN (
      SELECT r.id FROM public.church_need_responses r
      WHERE r.responder_church_id = public.get_church_id()
      UNION
      SELECT r.id FROM public.church_need_responses r
        JOIN public.church_needs n ON n.id = r.need_id
      WHERE n.church_id = public.get_church_id()
    )
  );
