'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

type Submitter = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

type Prayer = {
  id: string
  content: string
  is_private: boolean
  status: string
  submitted_by: string
  created_at: string
  submitter: Submitter | null
}

export function PrayerList({
  gatheringId,
  groupId,
  prayers: initialPrayers,
  currentUserId,
  isLeader,
}: {
  gatheringId: string
  groupId: string
  prayers: Prayer[]
  currentUserId: string
  isLeader: boolean
}) {
  const t = useTranslations('prayer')
  const [prayers, setPrayers] = useState(initialPrayers)
  const [addOpen, setAddOpen] = useState(false)
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resolveTarget, setResolveTarget] = useState<Prayer | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')

  async function addPrayer() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/gatherings/${gatheringId}/prayer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), is_private: isPrivate }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setPrayers(prev => [...prev, data])
      setContent('')
      setIsPrivate(false)
      setAddOpen(false)
      toast.success(t('toastAdded'))
    } catch {
      toast.error(t('toastError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function resolve(prayer: Prayer) {
    try {
      const res = await fetch(`/api/prayer/${prayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'answered',
          resolved_at: new Date().toISOString(),
          resolved_notes: resolveNotes || null,
        }),
      })
      if (!res.ok) throw new Error()
      setPrayers(prev => prev.map(p =>
        p.id === prayer.id ? { ...p, status: 'answered' } : p
      ))
      setResolveTarget(null)
      setResolveNotes('')
      toast.success(t('toastResolved'))
    } catch {
      toast.error(t('toastError'))
    }
  }

  const active = prayers.filter(p => p.status === 'active')
  const answered = prayers.filter(p => p.status === 'answered')

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div>
          <h2 className="font-semibold text-zinc-900">{t('sectionTitle')}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{t('activeCount', { count: active.length })}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          {t('addButton')}
        </Button>
      </div>

      {prayers.length === 0 ? (
        <p className="text-center py-8 text-sm text-zinc-400">{t('empty')}</p>
      ) : (
        <div className="divide-y divide-zinc-50">
          {active.map(p => <PrayerCard key={p.id} prayer={p} isLeader={isLeader} currentUserId={currentUserId} onResolve={() => setResolveTarget(p)} t={t} />)}
          {answered.length > 0 && (
            <>
              <div className="px-4 py-2 bg-zinc-50">
                <p className="text-xs font-medium text-zinc-400">{t('answeredSection')}</p>
              </div>
              {answered.map(p => <PrayerCard key={p.id} prayer={p} isLeader={isLeader} currentUserId={currentUserId} onResolve={() => {}} t={t} />)}
            </>
          )}
        </div>
      )}

      {/* Add prayer dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={t('addDialogContentPH')}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_private"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="is_private" className="text-sm text-zinc-700">
                {t('addDialogPrivate')}
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>{t('addDialogCancel')}</Button>
              <Button onClick={addPrayer} disabled={submitting || !content.trim()}>
                {submitting ? t('addDialogAdding') : t('addDialogAdd')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={() => { setResolveTarget(null); setResolveNotes('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resolveDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {resolveTarget && (
              <p className="text-sm text-zinc-600 bg-zinc-50 rounded-lg p-3">{resolveTarget.content}</p>
            )}
            <Textarea
              placeholder={t('resolveDialogNotesPH')}
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResolveTarget(null)}>{t('resolveDialogCancel')}</Button>
              <Button onClick={() => resolveTarget && resolve(resolveTarget)}>
                {t('resolveDialogConfirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PrayerCard({
  prayer,
  isLeader,
  currentUserId,
  onResolve,
  t,
}: {
  prayer: Prayer
  isLeader: boolean
  currentUserId: string
  onResolve: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const name = prayer.submitter
    ? `${prayer.submitter.first_name_ar || prayer.submitter.first_name || ''} ${prayer.submitter.last_name_ar || prayer.submitter.last_name || ''}`.trim()
    : t('cardUnknown')
  const initials = (prayer.submitter?.first_name_ar || prayer.submitter?.first_name || '?')[0].toUpperCase()
  const isAnswered = prayer.status === 'answered'

  return (
    <div className={`px-4 py-3 ${isAnswered ? 'opacity-60' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarImage src={prayer.submitter?.photo_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-700">{name}</span>
            {prayer.is_private && <span className="text-xs text-zinc-400">🔒</span>}
            {isAnswered && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{t('cardAnswered')}</span>}
          </div>
          <p className="text-sm text-zinc-700 leading-relaxed">{prayer.content}</p>
          {isLeader && !isAnswered && (
            <button
              onClick={onResolve}
              className="text-xs text-green-600 mt-2 hover:text-green-700"
            >
              {t('cardLogAnswer')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
