'use client'

import { useState, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SearchInput } from '@/components/ui/search-input'
import { toast } from 'sonner'
import { UserPlus, Phone, Mail, Cake, Info, Briefcase, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import { cn } from '@/lib/utils'

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
  new: 'bg-sky-100 text-sky-700',
  assigned: 'bg-amber-100 text-amber-700',
  contacted: 'bg-emerald-100 text-emerald-700',
  converted: 'bg-zinc-100 text-zinc-600',
  lost: 'bg-red-100 text-red-600',
}

const AGE_RANGE_KEYS: Record<string, string> = {
  under_18: 'ageRangeUnder18',
  '18_25': 'ageRange1825',
  '26_35': 'ageRange2635',
  '36_45': 'ageRange3645',
  '46_55': 'ageRange4655',
  '56_plus': 'ageRange56Plus',
}

const HOW_HEARD_KEYS: Record<string, string> = {
  friend: 'howHeardFriend',
  social_media: 'howHeardSocialMedia',
  website: 'howHeardWebsite',
  event: 'howHeardEvent',
  walk_in: 'howHeardWalkIn',
  other: 'howHeardOther',
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
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Visitor | null>(null)
  const [mode, setMode] = useState<'assign' | 'contact' | 'convert' | null>(null)
  const [detailVisitor, setDetailVisitor] = useState<Visitor | null>(null)
  const [assignTo, setAssignTo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const submittingRef = useRef(false)
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

  const filtered = useMemo(() => {
    let list = filter === 'all' ? localVisitors : localVisitors.filter(v => v.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) ||
        (v.phone && v.phone.includes(q))
      )
    }
    return list
  }, [localVisitors, filter, search])

  function isOverdue(v: Visitor) {
    return ['new', 'assigned'].includes(v.status) && now - new Date(v.visited_at).getTime() > slaMs
  }

  function getInitials(v: Visitor) {
    return `${v.first_name[0] || ''}${v.last_name[0] || ''}`.toUpperCase()
  }

  function openAction(v: Visitor, m: 'assign' | 'contact' | 'convert') {
    setSelected(v)
    setMode(m)
    setAssignTo(v.assigned_profile?.id || '')
    setNotes(v.contact_notes || '')
    setDetailVisitor(null)
  }

  function getPrimaryCTA(v: Visitor) {
    if (v.status === 'new') return { label: t('queueAssignButton'), action: 'assign' as const }
    if (v.status === 'assigned') return { label: t('queueLogContactButton'), action: 'contact' as const }
    if (v.status === 'contacted') return { label: t('queueConvertButton'), action: 'convert' as const }
    return null
  }

  function getSecondaryCTA(v: Visitor) {
    if (v.status === 'new') return { label: t('queueLogContactButton'), action: 'contact' as const }
    return null
  }

  async function submitAction() {
    if (!selected || !mode) return
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    try {
      const body: Record<string, unknown> = { action: mode }
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
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <SearchInput<Visitor>
          value={search}
          onChange={setSearch}
          placeholder={t('searchPlaceholder')}
          noResultsText={t('queueEmpty')}
          fetchResults={async (q) => {
            const res = await fetch(`/api/visitors?q=${encodeURIComponent(q)}&pageSize=6`)
            if (!res.ok) return []
            const json = await res.json()
            return json.data || []
          }}
          getKey={(v) => v.id}
          renderResult={(v) => (
            <div>
              <p className="font-medium">{v.first_name} {v.last_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {v.phone && <span>{v.phone}</span>}
                <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status]}`}>
                  {STATUS_LABELS[v.status]}
                </span>
              </div>
            </div>
          )}
          onSelect={(v) => {
            setSearch(`${v.first_name} ${v.last_name}`)
          }}
        />
      </div>

      {/* Filter pills with counts */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {['all', 'new', 'assigned', 'contacted'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]',
              filter === f
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {f === 'all' ? t('queueFilterAll') : STATUS_LABELS[f]}
            <span className="ms-1.5 text-xs opacity-60">
              {f === 'all' ? localVisitors.length : localVisitors.filter(v => v.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Visitor list */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('queueEmptyTitle')}</h3>
            <p className="text-sm text-zinc-500 max-w-[260px]">{t('queueEmptyBody')}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map(v => {
              const primary = getPrimaryCTA(v)
              const secondary = getSecondaryCTA(v)

              return (
                <div key={v.id} className="hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* Avatar */}
                    <div
                      className={cn(
                        'h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-medium',
                        isOverdue(v) ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
                      )}
                    >
                      {getInitials(v)}
                    </div>

                    {/* Info — tappable for detail sheet */}
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-start"
                      onClick={() => setDetailVisitor(v)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-zinc-900 text-sm">
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
                        {v.phone && <span dir="ltr">{v.phone}</span>}
                        <span>{t('queueVisitedAgo')} {formatDistanceToNow(v.visited_at)}</span>
                        {v.assigned_profile && (
                          <span>{t('queueAssignedTo')} {v.assigned_profile.first_name} {v.assigned_profile.last_name}</span>
                        )}
                      </div>
                    </button>

                    {/* Desktop actions */}
                    <div className="hidden sm:flex gap-2 shrink-0">
                      {primary && (
                        <Button size="sm" className="h-9" onClick={() => openAction(v, primary.action)}>
                          {primary.label}
                        </Button>
                      )}
                      {secondary && (
                        <Button size="sm" variant="outline" className="h-9" onClick={() => openAction(v, secondary.action)}>
                          {secondary.label}
                        </Button>
                      )}
                    </div>

                    {/* Mobile chevron */}
                    <ChevronRight
                      className="h-4 w-4 text-zinc-300 shrink-0 sm:hidden rtl:rotate-180"
                      onClick={() => setDetailVisitor(v)}
                    />
                  </div>

                  {/* Mobile action button */}
                  {primary && (
                    <div className="px-4 pb-3 sm:hidden">
                      <Button
                        size="sm"
                        className="w-full h-10"
                        onClick={() => openAction(v, primary.action)}
                      >
                        {primary.label}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Visitor Detail Bottom Sheet */}
      <Sheet open={!!detailVisitor} onOpenChange={() => setDetailVisitor(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh] overflow-y-auto">
          {detailVisitor && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{detailVisitor.first_name} {detailVisitor.last_name}</SheetTitle>
              </SheetHeader>

              {/* Status */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[detailVisitor.status]}`}>
                  {STATUS_LABELS[detailVisitor.status]}
                </span>
                {isOverdue(detailVisitor) && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">
                    {t('queueOverdueSla')}
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  {t('queueVisitedAgo')} {formatDistanceToNow(detailVisitor.visited_at)}
                </span>
              </div>

              {/* Contact info */}
              <div className="space-y-2.5 mb-6">
                {detailVisitor.phone && (
                  <a href={`tel:${detailVisitor.phone}`} className="flex items-center gap-3 text-sm text-zinc-700 hover:text-primary">
                    <Phone className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span dir="ltr">{detailVisitor.phone}</span>
                  </a>
                )}
                {detailVisitor.email && (
                  <a href={`mailto:${detailVisitor.email}`} className="flex items-center gap-3 text-sm text-zinc-700 hover:text-primary">
                    <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span dir="ltr">{detailVisitor.email}</span>
                  </a>
                )}
                {detailVisitor.age_range && (
                  <div className="flex items-center gap-3 text-sm text-zinc-700">
                    <Cake className="h-4 w-4 text-zinc-400 shrink-0" />
                    {t(AGE_RANGE_KEYS[detailVisitor.age_range] || detailVisitor.age_range)}
                  </div>
                )}
                {detailVisitor.occupation && (
                  <div className="flex items-center gap-3 text-sm text-zinc-700">
                    <Briefcase className="h-4 w-4 text-zinc-400 shrink-0" />
                    {detailVisitor.occupation}
                  </div>
                )}
                {detailVisitor.how_heard && (
                  <div className="flex items-center gap-3 text-sm text-zinc-700">
                    <Info className="h-4 w-4 text-zinc-400 shrink-0" />
                    {t(HOW_HEARD_KEYS[detailVisitor.how_heard] || detailVisitor.how_heard)}
                  </div>
                )}
              </div>

              {/* Assigned to */}
              {detailVisitor.assigned_profile && (
                <div className="mb-4 p-3 bg-zinc-50 rounded-lg text-sm">
                  <span className="text-zinc-500">{t('queueAssignedTo')}</span>{' '}
                  <span className="font-medium">{detailVisitor.assigned_profile.first_name} {detailVisitor.assigned_profile.last_name}</span>
                </div>
              )}

              {/* Contact notes */}
              {detailVisitor.contact_notes && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-zinc-900 mb-2">{t('detailContactNotes')}</h4>
                  <p className="text-sm text-zinc-600 bg-zinc-50 rounded-lg p-3 whitespace-pre-wrap">{detailVisitor.contact_notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {(() => {
                  const primary = getPrimaryCTA(detailVisitor)
                  const secondary = getSecondaryCTA(detailVisitor)
                  return (
                    <>
                      {primary && (
                        <Button className="w-full h-11" onClick={() => openAction(detailVisitor, primary.action)}>
                          {primary.label}
                        </Button>
                      )}
                      {secondary && (
                        <Button variant="outline" className="w-full h-11" onClick={() => openAction(detailVisitor, secondary.action)}>
                          {secondary.label}
                        </Button>
                      )}
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
                  dir="auto"
                  className="text-base"
                />
              )}

              {mode === 'convert' && (
                <p className="text-sm text-zinc-500">
                  {t('queueDialogConvertConfirm')}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" className="h-11 sm:h-auto" onClick={() => { setSelected(null); setMode(null) }}>
                  {t('queueDialogCancel')}
                </Button>
                <Button className="h-11 sm:h-auto" onClick={submitAction} disabled={loading || (mode === 'assign' && !assignTo)}>
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
