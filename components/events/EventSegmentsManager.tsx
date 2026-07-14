'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { SegmentEditor, type SegmentDraft, type SegmentKind, type BibleRefDraft, type AttachmentType } from '@/components/events/SegmentEditor'

interface LoadedSegment {
  id: string
  kind: SegmentKind | null
  title: string
  title_ar: string | null
  duration_minutes: number | null
  ministry_id: string | null
  assigned_to: string | null
  notes: string | null
  notes_ar: string | null
  song_id: string | null
  bible_ref: BibleRefDraft | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: AttachmentType | null
  sort_order: number
  ministry: { id: string; name: string; name_ar: string | null } | null
  song: { id: string; title: string; title_ar: string | null } | null
}

type EventSegmentsManagerProps = {
  eventId: string
}

/**
 * Editable run-of-show for event admins (can_manage_events).
 * Members keep the read-only EventRunOfShow; this manager lets leaders add
 * anything that happens during the service — songs, readings, a slideshow —
 * as free-form titled segments, then saves via PUT /api/events/[id]/segments
 * (full replace). Reuses SegmentEditor (same add/edit/delete/reorder UX as
 * TemplateForm).
 */
export function EventSegmentsManager({ eventId }: EventSegmentsManagerProps) {
  const t = useTranslations('events')
  const router = useRouter()

  const [segments, setSegments] = useState<SegmentDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`/api/events/${eventId}/segments`, { signal: controller.signal })
      .then(async r => {
        if (!r.ok) throw new Error('Failed to load segments')
        return r.json()
      })
      .then((d: { data?: LoadedSegment[] }) => {
        if (controller.signal.aborted) return
        const drafts: SegmentDraft[] = (d.data ?? []).map(s => ({
          kind: s.kind ?? 'generic',
          title: s.title,
          title_ar: s.title_ar ?? '',
          duration_minutes: s.duration_minutes,
          ministry_id: s.ministry_id,
          assigned_to: s.assigned_to,
          notes: s.notes ?? '',
          notes_ar: s.notes_ar ?? '',
          song_id: s.song_id,
          bible_ref: s.bible_ref,
          attachment_url: s.attachment_url,
          attachment_name: s.attachment_name,
          attachment_type: s.attachment_type,
          _ministry_name: s.ministry?.name,
          _ministry_name_ar: s.ministry?.name_ar ?? undefined,
          _song_title: s.song?.title,
          _song_title_ar: s.song?.title_ar ?? undefined,
        }))
        setSegments(drafts)
        setLoadFailed(false)
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === 'AbortError') return
        if (!controller.signal.aborted) setLoadFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [eventId])

  const handleChange = (updated: SegmentDraft[]) => {
    setSegments(updated)
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/segments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: segments.map(s => ({
            kind: s.kind,
            title: s.title,
            title_ar: s.title_ar || null,
            duration_minutes: s.duration_minutes || null,
            ministry_id: s.ministry_id || null,
            assigned_to: s.assigned_to || null,
            notes: s.notes || null,
            notes_ar: s.notes_ar || null,
            song_id: s.song_id || null,
            bible_ref: s.bible_ref || null,
            attachment_url: s.attachment_url || null,
            attachment_name: s.attachment_name || null,
            attachment_type: s.attachment_type || null,
          })),
        }),
      })
      if (!res.ok) throw new Error('Failed to save segments')
      setIsDirty(false)
      toast.success(t('runOfShowSaved'))
      router.refresh()
    } catch {
      toast.error(t('runOfShowSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="text-center py-8 text-sm text-zinc-500 border-2 border-dashed border-zinc-200 rounded-xl">
        {t('errorGeneral')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">{t('runOfShowHint')}</p>

      {/* SegmentEditor handles add/edit/delete-confirm/reorder + empty state */}
      <SegmentEditor segments={segments} onChange={handleChange} />

      <Button
        type="button"
        onClick={handleSave}
        disabled={!isDirty || isSaving}
        className="h-11 w-full sm:w-auto"
      >
        <Save className="h-4 w-4 me-1" />
        {isSaving ? t('savingRunOfShow') : t('saveRunOfShow')}
      </Button>
    </div>
  )
}
