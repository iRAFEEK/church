'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { formatDistanceToNow } from '@/lib/utils'

type Leader = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
}

type Visitor = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  age_range: string | null
  how_heard: string | null
  occupation: string | null
  visited_at: string
  status: string
  contact_notes: string | null
  escalated_at: string | null
  assigned_profile?: Leader | null
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  contacted: 'bg-green-100 text-green-700',
  converted: 'bg-zinc-100 text-zinc-600',
  lost: 'bg-red-100 text-red-600',
}

export function VisitorQueue({
  visitors,
  leaders,
  slaHours,
}: {
  visitors: Visitor[]
  leaders: Leader[]
  slaHours: number
}) {
  const t = useTranslations('visitors')
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Visitor | null>(null)
  const [mode, setMode] = useState<'assign' | 'contact' | 'convert' | null>(null)
  const [assignTo, setAssignTo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [localVisitors, setLocalVisitors] = useState(visitors)

  const STATUS_LABELS: Record<string, string> = {
    new: t('statusNew'),
    assigned: t('statusAssigned'),
    contacted: t('statusContacted'),
    converted: t('statusConverted'),
    lost: t('statusLost'),
  }

  const slaMs = slaHours * 60 * 60 * 1000
  const now = Date.now()

  const filtered = filter === 'all'
    ? localVisitors
    : localVisitors.filter(v => v.status === filter)

  function isOverdue(v: Visitor) {
    return ['new', 'assigned'].includes(v.status) && now - new Date(v.visited_at).getTime() > slaMs
  }

  function openAction(v: Visitor, m: 'assign' | 'contact' | 'convert') {
    setSelected(v)
    setMode(m)
    setAssignTo(v.assigned_profile?.id || '')
    setNotes(v.contact_notes || '')
  }

  async function submitAction() {
    if (!selected || !mode) return
    setLoading(true)
    try {
      let body: Record<string, unknown> = { action: mode }
      if (mode === 'assign') body.assigned_to = assignTo
      if (mode === 'contact') body.contact_notes = notes

      const res = await fetch(`/api/visitors/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(t('queueToastUpdateFailed'))
      const { data } = await res.json()

      setLocalVisitors(prev => prev.map(v => v.id === selected.id ? { ...v, ...data } : v))
      toast.success(
        mode === 'assign' ? t('queueToastAssigned') :
        mode === 'contact' ? t('queueToastContacted') :
        t('queueToastConverted')
      )
      setSelected(null)
      setMode(null)
    } catch {
      toast.error(t('queueToastError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all', 'new', 'assigned', 'contacted'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {f === 'all' ? t('queueFilterAll') : STATUS_LABELS[f]}
            <span className="ms-1.5 text-xs opacity-60">
              {f === 'all' ? localVisitors.length : localVisitors.filter(v => v.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm">{t('queueEmpty')}</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map(v => (
              <div key={v.id} className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors">
                {/* Name & info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900">
                      {v.first_name} {v.last_name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                    {isOverdue(v) && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                        {t('queueOverdueSla')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                    {v.phone && <span>{v.phone}</span>}
                    <span>{t('queueVisitedAgo')} {formatDistanceToNow(v.visited_at)}</span>
                    {v.assigned_profile && (
                      <span>{t('queueAssignedTo')} {v.assigned_profile.first_name} {v.assigned_profile.last_name}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {v.status === 'new' && (
                    <Button size="sm" variant="outline" onClick={() => openAction(v, 'assign')}>
                      {t('queueAssignButton')}
                    </Button>
                  )}
                  {['assigned', 'new'].includes(v.status) && (
                    <Button size="sm" variant="outline" onClick={() => openAction(v, 'contact')}>
                      {t('queueLogContactButton')}
                    </Button>
                  )}
                  {v.status === 'contacted' && (
                    <Button size="sm" variant="outline" onClick={() => openAction(v, 'convert')}>
                      {t('queueConvertButton')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selected && !!mode} onOpenChange={() => { setSelected(null); setMode(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'assign' && t('queueDialogAssignTitle')}
              {mode === 'contact' && t('queueDialogContactTitle')}
              {mode === 'convert' && t('queueDialogConvertTitle')}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                {t('queueDialogVisitorLabel')} <strong>{selected.first_name} {selected.last_name}</strong>
              </p>

              {mode === 'assign' && (
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('queueDialogLeaderPH')} />
                  </SelectTrigger>
                  <SelectContent>
                    {leaders.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.first_name_ar || l.first_name} {l.last_name_ar || l.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {mode === 'contact' && (
                <Textarea
                  placeholder={t('queueDialogContactNotesPH')}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                />
              )}

              {mode === 'convert' && (
                <p className="text-sm text-zinc-500">
                  {t('queueDialogConvertConfirm')}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setSelected(null); setMode(null) }}>
                  {t('queueDialogCancel')}
                </Button>
                <Button onClick={submitAction} disabled={loading || (mode === 'assign' && !assignTo)}>
                  {loading ? t('queueDialogSubmitting') : t('queueDialogConfirm')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
