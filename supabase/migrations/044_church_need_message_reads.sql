-- ============================================================
-- Track read-status for church need message threads
-- Enables unread count on the Messages tab
-- ============================================================

CREATE TABLE public.church_need_message_reads (
  response_id UUID NOT NULL REFERENCES public.church_need_responses(id) ON DELETE CASCADE,
  church_id   UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (response_id, church_id)
);

ALTER TABLE public.church_need_message_reads ENABLE ROW LEVEL SECURITY;

-- Both parties (need owner + responder) can manage their own read-status
CREATE POLICY "Churches manage own read-status"
  ON public.church_need_message_reads FOR ALL TO authenticated
  USING (church_id = public.get_church_id())
  WITH CHECK (church_id = public.get_church_id());
