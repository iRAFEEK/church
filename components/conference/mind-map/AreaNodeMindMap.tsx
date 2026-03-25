'use client'

import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { ConferenceArea } from '@/types'

interface AreaNodeData {
  area: ConferenceArea
  color: string
  teamCount: number
  readyCount: number
  eventId: string
  locale: string
  onTeamAdded: (areaId: string, team: { id: string; name: string; name_ar: string | null; area_id: string; target_headcount: number | null }) => void
}

export const AreaNodeMindMap = memo(function AreaNodeMindMap({ data }: { data: AreaNodeData }) {
  const { area, color, teamCount, readyCount, locale, eventId, onTeamAdded } = data
  const isRTL = locale.startsWith('ar')
  const areaName = isRTL ? (area.name_ar || area.name) : area.name

  const [adding, setAdding] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddTeam = async () => {
    if (!teamName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim(), area_id: area.id, sort_order: teamCount }),
      })
      if (!res.ok) throw new Error()
      const { data: newTeam } = await res.json()
      onTeamAdded(area.id, newTeam)
      setTeamName('')
      setAdding(false)
    } catch {
      toast.error('Failed to add team')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow w-[200px] select-none overflow-hidden border border-zinc-200"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      {/* All-4-side handles for free-form connections */}
      <Handle type="target" position={Position.Top} id="target-top" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Top} id="source-top" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Left} id="target-left" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Left} id="source-left" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Right} id="target-right" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Right} id="source-right" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />

      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
          <p className="font-medium text-sm text-zinc-900 flex-1 leading-snug" dir="auto">{areaName}</p>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 -mt-0.5 -me-1 opacity-0 group-hover:opacity-100 hover:!opacity-100 focus:!opacity-100"
            onClick={(e) => { e.stopPropagation(); setAdding(true) }}
            tabIndex={0}
            aria-label="Add team"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-zinc-500 mt-1 ps-6" dir="ltr">{teamCount} teams · {readyCount} ready</p>

        {adding && (
          <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <Input
              autoFocus
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="h-7 text-xs"
              dir="auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTeam()
                if (e.key === 'Escape') { setAdding(false); setTeamName('') }
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs flex-1 px-2" onClick={handleAddTeam} disabled={saving || !teamName.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setAdding(false); setTeamName('') }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!bg-zinc-300 !border-zinc-200 !w-2 !h-2 opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  )
})
