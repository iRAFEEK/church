-- Migration 091: rich run-of-show segments (Service Builder)
--
-- event_segments were free-form titled items. This lets each segment BE a specific
-- thing that can be displayed during the service:
--   kind='generic' — a titled item + notes (existing behavior; the default)
--   kind='song'    — links a songs row (present via /presenter/songs/[song_id])
--   kind='bible'   — a Bible passage (present via /presenter/bible/[bibleId]/[chapterId])
--   kind='file'    — an uploaded PDF / PowerPoint / image shown from service-attachments
--
-- Songs/Bible get an admin "Add to service" action that appends a song/bible segment.

ALTER TABLE public.event_segments
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'generic'
    CHECK (kind IN ('generic', 'song', 'bible', 'file')),
  -- song segment: the song being sung
  ADD COLUMN IF NOT EXISTS song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  -- bible segment: { bibleId, chapterId, reference, verse? } — enough to deep-link the presenter
  ADD COLUMN IF NOT EXISTS bible_ref JSONB,
  -- file segment: object in the service-attachments bucket
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;  -- 'pdf' | 'pptx' | 'image'

COMMENT ON COLUMN public.event_segments.kind IS
  'generic | song | bible | file — what this run-of-show item is and how it presents.';

CREATE INDEX IF NOT EXISTS idx_event_segments_song ON public.event_segments(song_id)
  WHERE song_id IS NOT NULL;

-- ── Storage bucket for service materials (PDF / PowerPoint / images) ──
-- Public like the existing song-backgrounds/profile-photos buckets, with church-scoped,
-- unguessable paths (church_id/<uuid>.<ext>). These are materials meant to be shown on a
-- projector during a service. 25 MB cap covers slide decks.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-attachments',
  'service-attachments',
  true,
  26214400, -- 25 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- .pptx
    'application/vnd.ms-powerpoint', -- .ppt
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Public read (projector display); writes go through the service-role upload route,
-- so no authenticated INSERT policy is needed (service role bypasses RLS).
DROP POLICY IF EXISTS "service-attachments public read" ON storage.objects;
CREATE POLICY "service-attachments public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-attachments');
