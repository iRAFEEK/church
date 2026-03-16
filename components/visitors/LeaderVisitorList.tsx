'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { formatDistanceToNow } from '@/lib/utils'
import { Phone, Mail, Briefcase, Cake, UserCheck, MessageSquare } from 'lucide-react'

type Visitor = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  age_range: string | null
  occupation: string | null
  visited_at: string
  status: string
  contact_notes: string | null
  contacted_at: string | null
}

const AGE_RANGE_KEYS: Record<string, string> = {
  under_18: 'ageRangeUnder18',
  '18_25': 'ageRange1825',
  '26_35': 'ageRange2635',
  '36_45': 'ageRange3645',
  '46_55': 'ageRange4655',
  '56_plus': 'ageRange56Plus',
}

export function LeaderVisitorList({ visitors, slaHours }: { visitors: Visitor[]; slaHours: number }) {
  const t = useTranslations('visitors')
  const [localVisitors, setLocalVisitors] = useState(visitors)
  const [selected, setSelected] = useState<Visitor | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const slaMs = slaHours * 60 * 60 * 1000
  const now = Date.now()

  function isOverdue(v: Visitor) {
    return ['new', 'assigned'].includes(v.status) && now - new Date(v.visited_at).getTime() > slaMs
  }

  async function markContacted() {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch(`/api/visitors/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'contact', contact_notes: notes }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setLocalVisitors(prev => prev.map(v => v.id === selected.id ? { ...v, ...data } : v))
      toast.success(t('leaderToastContactLogged'))
      setSelected(null)
    } catch {
      toast.error(t('leaderToastError'))
    } finally {
      setLoading(false)
    }
  }

  if (localVisitors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <UserCheck className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('leaderEmptyTitle')}</h3>
        <p className="text-sm text-zinc-500 max-w-[260px]">{t('leaderEmptySubtitle')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {localVisitors.map(v => (
        <div
          key={v.id}
          className={`rounded-xl border p-4 transition-colors ${
            isOverdue(v) ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-zinc-900">{v.first_name} {v.last_name}</span>
                {isOverdue(v) && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    {t('queueOverdueSla')}
                  </span>
                )}
                {v.status === 'contacted' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {t('statusContacted')}
                  </span>
                )}
              </div>

              <div className="text-sm text-zinc-500 space-y-1">
                {v.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span dir="ltr">{v.phone}</span>
                  </p>
                )}
                {v.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span dir="ltr">{v.email}</span>
                  </p>
                )}
                {v.occupation && (
                  <p className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {v.occupation}
                  </p>
                )}
                {v.age_range && (
                  <p className="flex items-center gap-1.5">
                    <Cake className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {t(AGE_RANGE_KEYS[v.age_range] || v.age_range)}
                  </p>
                )}
                <p className="text-xs text-zinc-400 mt-1">{t('queueVisitedAgo')} {formatDistanceToNow(v.visited_at)}</p>
              </div>

              {v.contact_notes && (
                <div className="mt-2 p-2 bg-zinc-50 rounded-lg text-xs text-zinc-600">
                  {v.contact_notes}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons — stacked on mobile */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            {v.phone && (
              <a
                href={`tel:${v.phone}`}
                className="flex items-center justify-center gap-2 h-11 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 hover:bg-blue-100 transition-colors"
              >
                <Phone className="h-4 w-4" />
                {t('leaderCallButton')}
              </a>
            )}
            {v.status !== 'contacted' && (
              <Button
                className="h-11 w-full sm:w-auto"
                onClick={() => { setSelected(v); setNotes(v.contact_notes || '') }}
              >
                <MessageSquare className="h-4 w-4 me-2" />
                {t('leaderLogContactButton')}
              </Button>
            )}
          </div>
        </div>
      ))}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('leaderLogContactTitle')}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                {selected.first_name} {selected.last_name}
              </p>
              <Textarea
                placeholder={t('leaderLogContactNotesPH')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                dir="auto"
                className="text-base"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>{t('leaderLogContactCancel')}</Button>
                <Button onClick={markContacted} disabled={loading}>
                  {loading ? t('leaderLogContactSubmitting') : t('leaderLogContactSubmit')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
