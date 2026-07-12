'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Trash2, GripVertical, Pencil, Clock, ListOrdered, Music, BookOpen, FileText, Search, Loader2, Upload, ExternalLink, Presentation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BIBLE_BOOKS_AR } from '@/lib/bible/constants'
import type { Ministry, ApiBibleBook } from '@/types'

export type SegmentKind = 'generic' | 'song' | 'bible' | 'file'
export type AttachmentType = 'pdf' | 'pptx' | 'ppt' | 'image'

export interface BibleRefDraft {
  bibleId: string
  chapterId: string
  reference: string
  verse?: number | null
}

export interface SegmentDraft {
  kind: SegmentKind
  title: string
  title_ar: string
  duration_minutes: number | null
  ministry_id: string | null
  assigned_to: string | null
  notes: string
  notes_ar: string
  song_id: string | null
  bible_ref: BibleRefDraft | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: AttachmentType | null
  // Display only
  _ministry_name?: string
  _ministry_name_ar?: string
  _person_name?: string
  _song_title?: string
  _song_title_ar?: string | null
}

interface SegmentEditorProps {
  segments: SegmentDraft[]
  onChange: (segments: SegmentDraft[]) => void
}

interface SongResult {
  id: string
  title: string
  title_ar: string | null
  artist: string | null
  artist_ar: string | null
}

type ChapterEntry = { id: string; number: string }

const KIND_META: Record<SegmentKind, { icon: typeof ListOrdered; labelKey: string; descKey: string }> = {
  generic: { icon: ListOrdered, labelKey: 'kindGeneric', descKey: 'kindGenericDesc' },
  song: { icon: Music, labelKey: 'kindSong', descKey: 'kindSongDesc' },
  bible: { icon: BookOpen, labelKey: 'kindBible', descKey: 'kindBibleDesc' },
  file: { icon: FileText, labelKey: 'kindFile', descKey: 'kindFileDesc' },
}

const DEFAULT_BIBLE_ID = 'ar-svd'

export function SegmentEditor({ segments, onChange }: SegmentEditorProps) {
  const t = useTranslations('templates')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [step, setStep] = useState<'kind' | 'form'>('kind')
  const [kind, setKind] = useState<SegmentKind>('generic')

  // Shared fields
  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [duration, setDuration] = useState<string>('')
  const [ministryId, setMinistryId] = useState('')
  const [notes, setNotes] = useState('')
  const [notesAr, setNotesAr] = useState('')

  // Song fields
  const [songId, setSongId] = useState<string | null>(null)
  const [songTitle, setSongTitle] = useState<string | null>(null)
  const [songTitleAr, setSongTitleAr] = useState<string | null>(null)
  const [songQuery, setSongQuery] = useState('')
  const [songResults, setSongResults] = useState<SongResult[]>([])
  const [songSearching, setSongSearching] = useState(false)

  // Bible fields
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID)
  const [bibleVersions, setBibleVersions] = useState<{ id: string; name: string; abbreviation_local: string | null }[]>([])
  const [bibleBooks, setBibleBooks] = useState<ApiBibleBook[]>([])
  const [chaptersMap, setChaptersMap] = useState<Record<string, ChapterEntry[]>>({})
  const [bibleLoading, setBibleLoading] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [verse, setVerse] = useState('')

  // File fields
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)
  const [attachmentType, setAttachmentType] = useState<AttachmentType | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ministries', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setMinistries(d.data || []) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[SegmentEditor] Failed to fetch ministries:', e)
        }
      })
    return () => controller.abort()
  }, [])

  // Debounced song search (only while the song form is active)
  useEffect(() => {
    if (kind !== 'song' || !dialogOpen) return
    const q = songQuery.trim()
    if (!q) { setSongResults([]); setSongSearching(false); return }
    setSongSearching(true)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/songs?q=${encodeURIComponent(q)}&pageSize=8&locale=${locale}`, { signal: controller.signal })
        .then(r => r.json())
        .then((d: { data?: SongResult[] }) => { if (!controller.signal.aborted) setSongResults(d.data ?? []) })
        .catch((e) => {
          if (e instanceof Error && e.name !== 'AbortError') {
            console.error('[SegmentEditor] Song search failed:', e)
          }
        })
        .finally(() => { if (!controller.signal.aborted) setSongSearching(false) })
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [songQuery, kind, dialogOpen, locale])

  // Load bible versions once the bible form is active
  useEffect(() => {
    if (kind !== 'bible' || !dialogOpen || bibleVersions.length > 0) return
    const controller = new AbortController()
    fetch('/api/bible/bibles', { signal: controller.signal })
      .then(r => r.json())
      .then((d: { data?: { id: string; name: string; abbreviation_local: string | null }[] }) => {
        if (!controller.signal.aborted) setBibleVersions(d.data ?? [])
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[SegmentEditor] Failed to fetch bible versions:', e)
        }
      })
    return () => controller.abort()
  }, [kind, dialogOpen, bibleVersions.length])

  // Load books + chapters for the selected version
  useEffect(() => {
    if (kind !== 'bible' || !dialogOpen || !bibleId) return
    const controller = new AbortController()
    setBibleLoading(true)
    Promise.all([
      fetch(`/api/bible/${bibleId}/books`, { signal: controller.signal }).then(r => r.json()),
      fetch(`/api/bible/${bibleId}/chapters-map`, { signal: controller.signal }).then(r => r.json()),
    ])
      .then(([booksRes, mapRes]: [{ data?: ApiBibleBook[] }, { data?: Record<string, ChapterEntry[]> }]) => {
        if (controller.signal.aborted) return
        setBibleBooks(booksRes.data ?? [])
        setChaptersMap(mapRes.data ?? {})
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[SegmentEditor] Failed to fetch bible books:', e)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setBibleLoading(false) })
    return () => controller.abort()
  }, [kind, dialogOpen, bibleId])

  const totalDuration = segments.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  const resetFields = () => {
    setTitle('')
    setTitleAr('')
    setDuration('')
    setMinistryId('')
    setNotes('')
    setNotesAr('')
    setSongId(null)
    setSongTitle(null)
    setSongTitleAr(null)
    setSongQuery('')
    setSongResults([])
    setBibleId(DEFAULT_BIBLE_ID)
    setSelectedBookId('')
    setSelectedChapterId('')
    setVerse('')
    setAttachmentUrl(null)
    setAttachmentName(null)
    setAttachmentType(null)
    setUploadError(null)
  }

  const openAddDialog = () => {
    setEditIndex(null)
    resetFields()
    setKind('generic')
    setStep('kind')
    setDialogOpen(true)
  }

  const openEditDialog = (index: number) => {
    const seg = segments[index]
    // Template segments (shared component) may arrive without `kind` — default it.
    const segKind: SegmentKind = seg.kind ?? 'generic'
    setEditIndex(index)
    resetFields()
    setKind(segKind)
    setTitle(seg.title)
    setTitleAr(seg.title_ar || '')
    setDuration(seg.duration_minutes ? String(seg.duration_minutes) : '')
    setMinistryId(seg.ministry_id || '')
    setNotes(seg.notes || '')
    setNotesAr(seg.notes_ar || '')
    if (segKind === 'song') {
      setSongId(seg.song_id)
      setSongTitle(seg._song_title ?? seg.title)
      setSongTitleAr(seg._song_title_ar ?? seg.title_ar ?? null)
    }
    if (segKind === 'bible' && seg.bible_ref) {
      setBibleId(seg.bible_ref.bibleId)
      setSelectedChapterId(seg.bible_ref.chapterId)
      setSelectedBookId(seg.bible_ref.chapterId.split('.')[0])
      setVerse(seg.bible_ref.verse ? String(seg.bible_ref.verse) : '')
    }
    if (segKind === 'file') {
      setAttachmentUrl(seg.attachment_url)
      setAttachmentName(seg.attachment_name)
      setAttachmentType(seg.attachment_type)
    }
    setStep('form')
    setDialogOpen(true)
  }

  const chooseKind = (k: SegmentKind) => {
    setKind(k)
    setStep('form')
  }

  const pickSong = (s: SongResult) => {
    setSongId(s.id)
    setSongTitle(s.title)
    setSongTitleAr(s.title_ar)
    setTitle(s.title)
    setTitleAr(s.title_ar || '')
    setSongResults([])
    setSongQuery('')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/events/segments/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('upload_failed')
      const data = (await res.json()) as { url: string; name: string; type: AttachmentType }
      setAttachmentUrl(data.url)
      setAttachmentName(data.name)
      setAttachmentType(data.type)
      setTitle(prev => prev || data.name)
    } catch {
      setUploadError(t('uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const chapterEntries: ChapterEntry[] = selectedBookId
    ? (chaptersMap[selectedBookId] || []).filter(c => c.number !== 'intro')
    : []

  const bookName = (b: ApiBibleBook) => (isRTL && BIBLE_BOOKS_AR[b.id] ? BIBLE_BOOKS_AR[b.id] : b.name)

  const buildBibleRef = (): { ref: BibleRefDraft; title: string; titleAr: string } | null => {
    if (!selectedBookId || !selectedChapterId) return null
    const book = bibleBooks.find(b => b.id === selectedBookId)
    if (!book) return null
    const chapter = chapterEntries.find(c => c.id === selectedChapterId)
    const chapterNum = chapter?.number ?? ''
    const v = verse ? parseInt(verse, 10) : null
    const suffix = `${chapterNum}${v ? `:${v}` : ''}`
    const enName = book.name
    const arName = BIBLE_BOOKS_AR[book.id] || book.name
    const refEn = `${enName} ${suffix}`.trim()
    const refAr = `${arName} ${suffix}`.trim()
    return {
      ref: { bibleId, chapterId: selectedChapterId, reference: isRTL ? refAr : refEn, verse: v },
      title: refEn,
      titleAr: refAr,
    }
  }

  const canSave = (() => {
    if (kind === 'song') return !!songId
    if (kind === 'bible') return !!selectedBookId && !!selectedChapterId
    if (kind === 'file') return !!attachmentUrl
    return !!title.trim()
  })()

  const handleSave = () => {
    if (!canSave) return
    const ministry = ministries.find(m => m.id === ministryId)

    let finalTitle = title
    let finalTitleAr = titleAr
    let bibleRef: BibleRefDraft | null = null

    if (kind === 'bible') {
      const built = buildBibleRef()
      if (!built) return
      bibleRef = built.ref
      finalTitle = built.title
      finalTitleAr = built.titleAr
    }
    if (kind === 'song') {
      finalTitle = songTitle ?? title
      finalTitleAr = songTitleAr ?? titleAr
    }

    const seg: SegmentDraft = {
      kind,
      title: finalTitle,
      title_ar: finalTitleAr,
      duration_minutes: duration ? parseInt(duration, 10) : null,
      ministry_id: ministryId || null,
      assigned_to: null,
      notes,
      notes_ar: notesAr,
      song_id: kind === 'song' ? songId : null,
      bible_ref: kind === 'bible' ? bibleRef : null,
      attachment_url: kind === 'file' ? attachmentUrl : null,
      attachment_name: kind === 'file' ? attachmentName : null,
      attachment_type: kind === 'file' ? attachmentType : null,
      _ministry_name: ministry?.name,
      _ministry_name_ar: ministry?.name_ar || undefined,
      _song_title: kind === 'song' ? (songTitle ?? undefined) : undefined,
      _song_title_ar: kind === 'song' ? songTitleAr : undefined,
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
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t('totalDuration')}: {totalDuration} {t('min')}
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={openAddDialog} className="h-11">
            <Plus className="h-4 w-4 me-1" />
            {t('addSegment')}
          </Button>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
          {t('noSegments')}
        </div>
      ) : (
        <div className="space-y-2">
          {segments.map((seg, i) => {
            const segTitle = isRTL ? (seg.title_ar || seg.title) : seg.title
            const ministryName = isRTL
              ? (seg._ministry_name_ar || seg._ministry_name)
              : seg._ministry_name
            const KindIcon = KIND_META[seg.kind]?.icon ?? ListOrdered
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
                    aria-label={t('moveUp')}
                  >
                    <GripVertical className="h-3 w-3 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSegment(i, 1)}
                    disabled={i === segments.length - 1}
                    className="p-0.5 text-zinc-300 hover:text-zinc-500 disabled:opacity-30"
                    aria-label={t('moveDown')}
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <KindIcon className="h-4 w-4" />
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
                    {seg.kind === 'file' && seg.attachment_type && (
                      <span className="uppercase">{(seg.duration_minutes || ministryName) ? ' · ' : ''}{seg.attachment_type}</span>
                    )}
                  </p>
                </div>

                <SegmentPresentAction
                  kind={seg.kind}
                  songId={seg.song_id}
                  bibleRef={seg.bible_ref}
                  attachmentUrl={seg.attachment_url}
                />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditDialog(i)}
                    className="p-2 h-11 w-11 flex items-center justify-center rounded-lg hover:bg-zinc-200 text-zinc-500 hover:text-zinc-600 transition-colors"
                    aria-label={t('editSegment')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="p-2 h-11 w-11 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-500 hover:text-red-500 transition-colors"
                        aria-label={t('removeSegment')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('confirmRemoveSegmentTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('confirmRemoveSegmentBody')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancelRemove')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemove(i)} className="bg-red-600 hover:bg-red-700">
                          {t('confirmRemove')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn('sm:max-w-md max-h-[90vh] overflow-y-auto', isRTL && 'rtl')}>
          <DialogHeader>
            <DialogTitle>
              {step === 'kind'
                ? t('chooseKind')
                : editIndex !== null ? t('editSegment') : t(KIND_META[kind].labelKey)}
            </DialogTitle>
          </DialogHeader>

          {step === 'kind' ? (
            <div className="grid grid-cols-2 gap-3 py-2">
              {(Object.keys(KIND_META) as SegmentKind[]).map((k) => {
                const meta = KIND_META[k]
                const Icon = meta.icon
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => chooseKind(k)}
                    className="flex flex-col items-start gap-2 p-4 min-h-[88px] rounded-xl border border-zinc-200 bg-white hover:border-primary/40 hover:bg-primary/5 text-start transition-colors"
                  >
                    <span className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-zinc-800">{t(meta.labelKey)}</span>
                    <span className="text-xs text-zinc-500 leading-tight">{t(meta.descKey)}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Kind-specific fields */}
              {kind === 'generic' && (
                <>
                  <div>
                    <Label htmlFor="segment-title" className="text-sm text-zinc-500 mb-1 block">{t('segmentTitle')} *</Label>
                    <Input
                      id="segment-title"
                      aria-required="true"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('segmentTitlePlaceholder')}
                      dir="auto"
                      className="text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="segment-title-ar" className="text-sm text-zinc-500 mb-1 block">{t('segmentTitleAr')}</Label>
                    <Input
                      id="segment-title-ar"
                      value={titleAr}
                      onChange={(e) => setTitleAr(e.target.value)}
                      dir="rtl"
                      className="text-base"
                    />
                  </div>
                </>
              )}

              {kind === 'song' && (
                <div>
                  <Label className="text-sm text-zinc-500 mb-1 block">{t('searchSong')}</Label>
                  {songId ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                      <Music className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-zinc-800 flex-1 truncate">
                        {isRTL ? (songTitleAr || songTitle) : songTitle}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9"
                        onClick={() => { setSongId(null); setSongTitle(null); setSongTitleAr(null) }}
                      >
                        {t('changeSong')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-zinc-400" />
                        <Input
                          value={songQuery}
                          onChange={(e) => setSongQuery(e.target.value)}
                          placeholder={t('searchSongPlaceholder')}
                          dir="auto"
                          className="text-base ps-9"
                        />
                        {songSearching && (
                          <Loader2 className="absolute top-1/2 -translate-y-1/2 end-3 h-4 w-4 text-zinc-400 animate-spin" />
                        )}
                      </div>
                      {songQuery.trim() && !songSearching && songResults.length === 0 && (
                        <p className="text-xs text-zinc-500 mt-2">{t('noSongsFound')}</p>
                      )}
                      {songResults.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-56 overflow-y-auto rounded-lg border border-zinc-200">
                          {songResults.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => pickSong(s)}
                              className="w-full text-start px-3 py-2.5 min-h-[44px] hover:bg-zinc-50 border-b border-zinc-100 last:border-0 transition-colors"
                            >
                              <span className="text-sm font-medium text-zinc-800 block truncate">
                                {isRTL ? (s.title_ar || s.title) : s.title}
                              </span>
                              {(s.artist || s.artist_ar) && (
                                <span className="text-xs text-zinc-500 block truncate">
                                  {isRTL ? (s.artist_ar || s.artist) : s.artist}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {kind === 'bible' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bible-version" className="text-sm text-zinc-500 mb-1 block">{t('bibleVersion')}</Label>
                    <select
                      id="bible-version"
                      value={bibleId}
                      onChange={(e) => { setBibleId(e.target.value); setSelectedBookId(''); setSelectedChapterId('') }}
                      className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-base"
                    >
                      {bibleVersions.length === 0 && <option value={bibleId}>{bibleId}</option>}
                      {bibleVersions.map(v => (
                        <option key={v.id} value={v.id}>{v.abbreviation_local || v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="bible-book" className="text-sm text-zinc-500 mb-1 block">{t('book')} *</Label>
                    <select
                      id="bible-book"
                      value={selectedBookId}
                      onChange={(e) => { setSelectedBookId(e.target.value); setSelectedChapterId('') }}
                      disabled={bibleLoading || bibleBooks.length === 0}
                      className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-base disabled:opacity-50"
                    >
                      <option value="">{bibleLoading ? t('loading') : t('selectBookPlaceholder')}</option>
                      {bibleBooks.map(b => (
                        <option key={b.id} value={b.id}>{bookName(b)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="bible-chapter" className="text-sm text-zinc-500 mb-1 block">{t('chapter')} *</Label>
                      <select
                        id="bible-chapter"
                        value={selectedChapterId}
                        onChange={(e) => setSelectedChapterId(e.target.value)}
                        disabled={!selectedBookId}
                        className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-base disabled:opacity-50"
                      >
                        <option value="">{t('selectChapterPlaceholder')}</option>
                        {chapterEntries.map(c => (
                          <option key={c.id} value={c.id}>{c.number}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="bible-verse" className="text-sm text-zinc-500 mb-1 block">{t('verseOptional')}</Label>
                      <Input
                        id="bible-verse"
                        type="number"
                        min={1}
                        value={verse}
                        onChange={(e) => setVerse(e.target.value)}
                        dir="ltr"
                        className="text-base"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {kind === 'file' && (
                <div>
                  <Label className="text-sm text-zinc-500 mb-1 block">{t('kindFile')}</Label>
                  {attachmentUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-zinc-800 flex-1 truncate">{attachmentName}</span>
                        {attachmentType && <Badge variant="secondary" className="text-xs uppercase">{attachmentType}</Badge>}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9"
                          onClick={() => { setAttachmentUrl(null); setAttachmentName(null); setAttachmentType(null) }}
                        >
                          {t('removeFile')}
                        </Button>
                      </div>
                      <div>
                        <Label htmlFor="file-title" className="text-sm text-zinc-500 mb-1 block">{t('segmentTitle')}</Label>
                        <Input
                          id="file-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          dir="auto"
                          className="text-base"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.ppt,.pptx,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="segment-file-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Upload className="h-4 w-4 me-2" />}
                        {uploading ? t('uploading') : t('chooseFile')}
                      </Button>
                      {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
                      <p className="text-xs text-zinc-400 mt-2">{t('fileAcceptHint')}</p>
                    </>
                  )}
                </div>
              )}

              {/* Shared fields — duration, ministry, notes */}
              <div>
                <Label htmlFor="segment-duration" className="text-sm text-zinc-500 mb-1 block">{t('durationMinutes')}</Label>
                <Input
                  id="segment-duration"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  dir="ltr"
                  className="text-base"
                />
              </div>
              <div>
                <Label htmlFor="segment-ministry" className="text-sm text-zinc-500 mb-1 block">{t('ministry')}</Label>
                <select
                  id="segment-ministry"
                  value={ministryId}
                  onChange={(e) => setMinistryId(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-base"
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
                <Label htmlFor="segment-notes" className="text-sm text-zinc-500 mb-1 block">{t('segmentNotes')}</Label>
                <Textarea
                  id="segment-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  dir="auto"
                  className="text-base"
                  placeholder={t('segmentNotesPlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="segment-notes-ar" className="text-sm text-zinc-500 mb-1 block">{t('segmentNotesAr')}</Label>
                <Textarea
                  id="segment-notes-ar"
                  value={notesAr}
                  onChange={(e) => setNotesAr(e.target.value)}
                  rows={2}
                  dir="rtl"
                  className="text-base"
                />
              </div>
            </div>
          )}

          {step === 'form' && (
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              {editIndex === null && (
                <Button type="button" variant="outline" onClick={() => setStep('kind')} className="h-11 w-full sm:w-auto">
                  {t('back')}
                </Button>
              )}
              <Button type="button" onClick={handleSave} disabled={!canSave} className="h-11 w-full sm:flex-1">
                {editIndex !== null ? t('editSegment') : t('addSegment')}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Shared "Present"/"Open" action rendered by kind — used by the editor and the
// read-only run-of-show. Opens the presenter (song/bible) or the file in a new tab.
export function SegmentPresentAction({
  kind,
  songId,
  bibleRef,
  attachmentUrl,
  className,
}: {
  kind: SegmentKind
  songId: string | null
  bibleRef: BibleRefDraft | null
  attachmentUrl: string | null
  className?: string
}) {
  const t = useTranslations('templates')

  let href: string | null = null
  let label = ''
  let Icon = Presentation

  if (kind === 'song' && songId) {
    href = `/presenter/songs/${songId}`
    label = t('present')
    Icon = Presentation
  } else if (kind === 'bible' && bibleRef) {
    href = `/presenter/bible/${bibleRef.bibleId}/${bibleRef.chapterId}?verse=${bibleRef.verse ?? ''}`
    label = t('present')
    Icon = Presentation
  } else if (kind === 'file' && attachmentUrl) {
    href = attachmentUrl
    label = t('open')
    Icon = ExternalLink
  }

  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-lg border border-primary/30 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex-shrink-0',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </a>
  )
}

export function SegmentKindIcon({ kind, className }: { kind: SegmentKind; className?: string }) {
  const Icon = KIND_META[kind]?.icon ?? ListOrdered
  return <Icon className={className} />
}
