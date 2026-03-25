'use client'

import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useTranslations } from 'next-intl'
import { StickyNote, Tag, Plus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { Node } from '@xyflow/react'
import type { TeamWithCard } from './useMindMapLayout'

interface Props {
  eventId: string
  locale: string
  onAddCustomNode: (node: Node) => void
  onAreaAdded: (area: { id: string; name: string; name_ar: string | null; event_id: string; church_id: string; parent_area_id: string | null; sort_order: number; description: string | null; description_ar: string | null; location_hint: string | null; location_hint_ar: string | null; created_at: string; updated_at: string }) => void
  onTeamAdded: (areaId: string, team: TeamWithCard) => void
}

function genId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function CanvasToolbar({ eventId, locale, onAddCustomNode, onAreaAdded }: Props) {
  const t = useTranslations('conference')
  const { screenToFlowPosition, getViewport } = useReactFlow()
  const [addingArea, setAddingArea] = useState(false)
  const [areaName, setAreaName] = useState('')
  const [savingArea, setSavingArea] = useState(false)

  const getCenter = () => {
    // Place new node at viewport center
    const vp = getViewport()
    const el = document.querySelector('.react-flow__renderer') as HTMLElement
    const w = el?.offsetWidth || 800
    const h = el?.offsetHeight || 600
    return screenToFlowPosition({ x: w / 2, y: h / 2 })
  }

  const handleAddNote = () => {
    const pos = getCenter()
    onAddCustomNode({
      id: genId(),
      type: 'stickyNote',
      position: pos,
      data: { text: '', color: 'yellow' },
    })
  }

  const handleAddLabel = () => {
    const pos = getCenter()
    onAddCustomNode({
      id: genId(),
      type: 'label',
      position: pos,
      data: { text: '' },
    })
  }

  const handleAddArea = async () => {
    if (!areaName.trim()) return
    setSavingArea(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: areaName.trim() }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      onAreaAdded(data)
      setAreaName('')
      setAddingArea(false)
    } catch {
      toast.error('Failed to add area')
    } finally {
      setSavingArea(false)
    }
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-zinc-200 rounded-2xl shadow-lg px-2 py-1.5">
      {/* Add Area */}
      {addingArea ? (
        <div className="flex items-center gap-1.5 px-1">
          <Input
            autoFocus
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Area name"
            className="h-7 text-xs w-32"
            dir="auto"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddArea()
              if (e.key === 'Escape') { setAddingArea(false); setAreaName('') }
            }}
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleAddArea} disabled={savingArea || !areaName.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setAddingArea(false); setAreaName('') }}>
            ✕
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setAddingArea(true)}
        >
          <MapPin className="h-3.5 w-3.5" />
          {t('mindMap.addArea')}
        </Button>
      )}

      <div className="w-px h-5 bg-zinc-200" />

      {/* Add Sticky Note */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleAddNote}
        aria-label={t('canvas.addNote')}
      >
        <StickyNote className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('canvas.addNote')}</span>
      </Button>

      {/* Add Label */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleAddLabel}
        aria-label={t('canvas.addLabel')}
      >
        <Tag className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('canvas.addLabel')}</span>
      </Button>
    </div>
  )
}
