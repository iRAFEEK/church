'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, GripVertical, Pencil, Clock, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ministry } from '@/types'

export interface SegmentDraft {
  title: string
  title_ar: string
  duration_minutes: number | null
  ministry_id: string | null
  assigned_to: string | null
  notes: string
  notes_ar: string
  // Display only
  _ministry_name?: string
  _ministry_name_ar?: string
  _person_name?: string
}

interface SegmentEditorProps {
  segments: SegmentDraft[]
  onChange: (segments: SegmentDraft[]) => void
}

export function SegmentEditor({ segments, onChange }: SegmentEditorProps) {
  const t = useTranslations('templates')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [duration, setDuration] = useState<string>('')
  const [ministryId, setMinistryId] = useState('')
  const [notes, setNotes] = useState('')
  const [notesAr, setNotesAr] = useState('')

  useEffect(() => {
    fetch('/api/ministries').then(r => r.json()).then(d => setMinistries(d.data || []))
  }, [])

  const totalDuration = segments.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  const openAddDialog = () => {
    setEditIndex(null)
    setTitle('')
    setTitleAr('')
    setDuration('')
    setMinistryId('')
    setNotes('')
    setNotesAr('')
    setDialogOpen(true)
  }

  const openEditDialog = (index: number) => {
    const seg = segments[index]
    setEditIndex(index)
    setTitle(seg.title)
    setTitleAr(seg.title_ar || '')
    setDuration(seg.duration_minutes ? String(seg.duration_minutes) : '')
    setMinistryId(seg.ministry_id || '')
    setNotes(seg.notes || '')
    setNotesAr(seg.notes_ar || '')
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!title) return
    const ministry = ministries.find(m => m.id === ministryId)
    const seg: SegmentDraft = {
      title,
      title_ar: titleAr,
      duration_minutes: duration ? parseInt(duration) : null,
      ministry_id: ministryId || null,
      assigned_to: null,
      notes,
      notes_ar: notesAr,
      _ministry_name: ministry?.name,
      _ministry_name_ar: ministry?.name_ar || undefined,
    }
    if (editIndex !== null) {
      const updated = [...segments]
      updated[editIndex] = seg
      onChange(updated)
    } else {
      onChange([...segments, seg])
    }
    setDialogOpen(false)
  }

  const handleRemove = (index: number) => {
    onChange(segments.filter((_, i) => i !== index))
  }

  const moveSegment = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= segments.length) return
    const updated = [...segments]
    const [moved] = updated.splice(index, 1)
    updated.splice(newIndex, 0, moved)
    onChange(updated)
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-500">
          <ListOrdered className="h-5 w-5" />
          <span className="text-sm font-medium">{t('runOfShow')}</span>
        </div>
        <div className="flex items-center gap-3">
          {totalDuration > 0 && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t('totalDuration')}: {totalDuration} {t('min')}
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 me-1" />
            {t('addSegment')}
          </Button>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
          {t('noSegments')}
        </div>
      ) : (
        <div className="space-y-2">
          {segments.map((seg, i) => {
            const segTitle = isRTL ? (seg.title_ar || seg.title) : seg.title
            const ministryName = isRTL
              ? (seg._ministry_name_ar || seg._ministry_name)
              : seg._ministry_name
            return (
              <div
                key={i}
                className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 bg-zinc-50"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSegment(i, -1)}
                    disabled={i === 0}
                    className="p-0.5 text-zinc-300 hover:text-zinc-500 disabled:opacity-30"
                  >
                    <GripVertical className="h-3 w-3 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSegment(i, 1)}
                    disabled={i === segments.length - 1}
                    className="p-0.5 text-zinc-300 hover:text-zinc-500 disabled:opacity-30"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{segTitle}</p>
                  <p className="text-xs text-zinc-500">
                    {seg.duration_minutes && (
                      <span>{seg.duration_minutes} {t('min')}</span>
                    )}
                    {ministryName && (
                      <span>{seg.duration_minutes ? ' · ' : ''}{ministryName}</span>
                    )}
                  </p>
                  {(seg.notes || seg.notes_ar) && (
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">
                      {isRTL ? (seg.notes_ar || seg.notes) : (seg.notes || seg.notes_ar)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditDialog(i)}
                    className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? t('editSegment') : t('addSegment')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('segmentTitle')} *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Worship, Sermon, Offering"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('segmentTitleAr')}</Label>
              <Input
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                dir="rtl"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('durationMinutes')}</Label>
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('ministry')}</Label>
              <select
                value={ministryId}
                onChange={(e) => setMinistryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm"
              >
                <option value="">{t('noMinistry')}</option>
                {ministries.filter(m => m.is_active).map(m => (
                  <option key={m.id} value={m.id}>
                    {isRTL ? (m.name_ar || m.name) : m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('segmentNotes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                dir="ltr"
                placeholder="e.g., Pastor to prepare communion intro"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('segmentNotesAr')}</Label>
              <Textarea
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                rows={2}
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={!title} className="w-full">
              {editIndex !== null ? t('editSegment') : t('addSegment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
