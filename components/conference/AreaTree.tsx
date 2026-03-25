'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Folder, AlertTriangle, Loader2 } from 'lucide-react'
import { AreaNode } from './AreaNode'
import type { ConferenceAreaWithChildren } from '@/types'

interface Props {
  eventId: string
  churchId: string
  initialAreas: ConferenceAreaWithChildren[]
  locale: string
}

export function AreaTree({ eventId, churchId, initialAreas, locale }: Props) {
  const t = useTranslations('conference')
  const [areas, setAreas] = useState<ConferenceAreaWithChildren[]>(initialAreas)
  const [addingArea, setAddingArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAreaName.trim(), sort_order: areas.length }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setAreas((prev) => [...prev, { ...data, children: [], teams: [] }])
      setNewAreaName('')
      setAddingArea(false)
    } catch {
      toast.error('Failed to add area')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteArea = async (areaId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/conference/areas/${areaId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      const removeArea = (items: ConferenceAreaWithChildren[]): ConferenceAreaWithChildren[] =>
        items.filter((a) => a.id !== areaId).map((a) => ({ ...a, children: removeArea(a.children) }))
      setAreas((prev) => removeArea(prev))
    } catch {
      toast.error('Failed to delete area')
    }
  }

  const handleUpdateArea = (areaId: string, updates: Partial<ConferenceAreaWithChildren>) => {
    const update = (items: ConferenceAreaWithChildren[]): ConferenceAreaWithChildren[] =>
      items.map((a) =>
        a.id === areaId
          ? { ...a, ...updates }
          : { ...a, children: update(a.children) }
      )
    setAreas((prev) => update(prev))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('structure')}</h2>
        <Button onClick={() => setAddingArea(true)} size="sm" className="h-10">
          <Plus className="h-4 w-4 me-1" />
          {t('addArea')}
        </Button>
      </div>

      {addingArea && (
        <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
          <Input
            placeholder={t('area')}
            value={newAreaName}
            dir="auto"
            className="text-base"
            onChange={(e) => setNewAreaName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddArea()
              if (e.key === 'Escape') {
                setAddingArea(false)
                setNewAreaName('')
              }
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddArea} disabled={saving || !newAreaName.trim()} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('saveColumn')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingArea(false); setNewAreaName('') }}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}

      {areas.length === 0 && !addingArea && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Folder className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
          <p className="font-medium text-muted-foreground">{t('emptyStructure')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('emptyStructureDesc')}</p>
        </div>
      )}

      <div className="space-y-3">
        {areas.map((area) => (
          <AreaNode
            key={area.id}
            area={area}
            eventId={eventId}
            churchId={churchId}
            locale={locale}
            depth={0}
            onDelete={handleDeleteArea}
            onUpdate={handleUpdateArea}
          />
        ))}
      </div>
    </div>
  )
}
