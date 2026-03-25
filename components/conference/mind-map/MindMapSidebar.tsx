'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { GripVertical, Search, Check, Plus, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { TeamWithCard } from './useMindMapLayout'

interface Ministry {
  id: string
  name: string
  name_ar: string | null
}

interface Props {
  ministries: Ministry[]
  teams: TeamWithCard[]
  areaCount: number
  locale: string
  eventId: string
  churchId: string
  onDragMinistry: (ministry: Ministry) => void
  onAreaAdded: (area: { id: string; name: string; name_ar: string | null; parent_area_id: string | null; event_id: string; church_id: string; sort_order: number; description: string | null; description_ar: string | null; location_hint: string | null; location_hint_ar: string | null; created_at: string; updated_at: string }) => void
}

export function MindMapSidebar({
  ministries,
  teams,
  areaCount,
  locale,
  eventId,
  churchId,
  onDragMinistry,
  onAreaAdded,
}: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const [search, setSearch] = useState('')
  const [addingArea, setAddingArea] = useState(false)
  const [areaName, setAreaName] = useState('')
  const [savingArea, setSavingArea] = useState(false)

  const assignedMinistryIds = useMemo(
    () => new Set(teams.filter((t) => t.ministryName).map((t) => t.id)),
    [teams]
  )

  const filtered = useMemo(
    () =>
      ministries.filter((m) => {
        const name = isRTL ? (m.name_ar || m.name) : m.name
        return name.toLowerCase().includes(search.toLowerCase())
      }),
    [ministries, search, isRTL]
  )

  const readyCount = teams.filter((t) => t.cardStatus === 'ready').length
  const noLeaderCount = teams.filter(
    (t) => t.ministryName && !t.assignedLeaderName
  ).length

  const handleAddArea = async () => {
    if (!areaName.trim()) return
    setSavingArea(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: areaName.trim(), sort_order: areaCount }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      onAreaAdded(data)
      setAreaName('')
      setAddingArea(false)
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSavingArea(false)
    }
  }

  return (
    <aside className="w-[280px] shrink-0 bg-zinc-50 border-e border-zinc-200 flex flex-col h-full overflow-hidden">
      {/* Ministry palette */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        <p className="text-sm font-semibold text-zinc-700">{t('mindMap.availableMinistries')}</p>

        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('mindMap.searchMinistries')}
            className="ps-8 h-9 text-sm"
            dir="auto"
          />
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-6 text-sm text-zinc-400">
            {ministries.length === 0 ? t('mindMap.noMinistries') : t('mindMap.noResults')}
          </div>
        )}

        <div className="space-y-1.5">
          {filtered.map((ministry) => {
            const name = isRTL ? (ministry.name_ar || ministry.name) : ministry.name
            const isAssigned = assignedMinistryIds.has(ministry.id)
            return (
              <div
                key={ministry.id}
                draggable
                onDragStart={() => onDragMinistry(ministry)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all',
                  isAssigned && 'opacity-60'
                )}
              >
                <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate" dir="auto">{name}</p>
                </div>
                {isAssigned && (
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200 px-4 py-3 space-y-2">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{t('mindMap.canvas')}</p>

        {addingArea ? (
          <div className="space-y-1.5">
            <Input
              autoFocus
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder={t('mindMap.areaName')}
              className="h-9 text-sm"
              dir="auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddArea()
                if (e.key === 'Escape') { setAddingArea(false); setAreaName('') }
              }}
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="flex-1 h-8"
                onClick={handleAddArea}
                disabled={savingArea || !areaName.trim()}
              >
                {savingArea ? <Loader2 className="h-3 w-3 animate-spin" /> : t('mindMap.addArea')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => { setAddingArea(false); setAreaName('') }}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-11 justify-start text-sm"
            onClick={() => setAddingArea(true)}
          >
            <Plus className="h-4 w-4 me-2" />
            {t('mindMap.addArea')}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-zinc-200 px-4 py-3">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">{t('mindMap.overview')}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">{t('mindMap.areas')}</span>
            <span className="tabular-nums font-medium" dir="ltr">{areaCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">{t('mindMap.teams')}</span>
            <span className="tabular-nums font-medium" dir="ltr">{teams.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">{t('mindMap.ready')}</span>
            <span className="tabular-nums font-medium text-emerald-600" dir="ltr">{readyCount} / {teams.length}</span>
          </div>
          {noLeaderCount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">{t('mindMap.noLeader')}</span>
              <span className="tabular-nums font-medium text-red-500" dir="ltr">{noLeaderCount}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
