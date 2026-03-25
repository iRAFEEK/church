'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Check, X, Users, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConferenceAreaWithChildren } from '@/types'

// Local type for teams (only what we use)
interface TeamRow {
  id: string
  name: string
  name_ar: string | null
  target_headcount: number | null
  muster_point?: string | null
  muster_point_ar?: string | null
  area_id?: string | null
}

interface Props {
  area: ConferenceAreaWithChildren
  eventId: string
  churchId: string
  locale: string
  depth: number
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<ConferenceAreaWithChildren>) => void
}

export function AreaNode({ area, eventId, churchId, locale, depth, onDelete, onUpdate }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const [open, setOpen] = useState(depth === 0)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(area.name)
  const [saving, setSaving] = useState(false)
  const [addingTeam, setAddingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)
  const [teams, setTeams] = useState<TeamRow[]>((area.teams || []) as unknown as TeamRow[])

  const areaName = isRTL ? (area.name_ar || area.name) : area.name

  const handleSaveName = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/areas/${area.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error()
      onUpdate(area.id, { name: editName.trim() })
      setEditing(false)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return
    setSavingTeam(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim(), area_id: area.id, sort_order: teams.length }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setTeams((prev) => [...prev, data as TeamRow])
      setNewTeamName('')
      setAddingTeam(false)
    } catch {
      toast.error('Failed to add team')
    } finally {
      setSavingTeam(false)
    }
  }

  return (
    <div className={cn('rounded-xl border bg-card', depth > 0 && 'ms-6 border-dashed')}>
      {/* Area header */}
      <div className="flex items-center gap-2 p-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          }
        </Button>

        {editing ? (
          <div className="flex-1 flex gap-1">
            <Input
              className="h-7 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              dir="auto"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') { setEditing(false); setEditName(area.name) }
              }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(false); setEditName(area.name) }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <span className="flex-1 font-medium text-sm">{areaName}</span>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {teams.length} {t('teams').toLowerCase()}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
              aria-label={t('editColumn')}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(area.id)}
              aria-label={t('deleteColumn')}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t pt-3">
          {/* Teams */}
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm">{isRTL ? (team.name_ar || team.name) : team.name}</span>
              {team.target_headcount && (
                <span className="text-xs text-muted-foreground" dir="ltr">{team.target_headcount}</span>
              )}
            </div>
          ))}

          {/* Add team */}
          {addingTeam ? (
            <div className="space-y-2">
              <Input
                placeholder={t('team')}
                value={newTeamName}
                dir="auto"
                className="text-base h-9"
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTeam()
                  if (e.key === 'Escape') { setAddingTeam(false); setNewTeamName('') }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTeam} disabled={savingTeam || !newTeamName.trim()} className="flex-1">
                  {savingTeam ? <Loader2 className="h-3 w-3 animate-spin" /> : t('saveColumn')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingTeam(false); setNewTeamName('') }}>
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground h-9"
              onClick={() => setAddingTeam(true)}
            >
              <Plus className="h-4 w-4 me-1" />
              {t('addTeam')}
            </Button>
          )}

          {/* Sub-areas */}
          {area.children.map((child) => (
            <AreaNode
              key={child.id}
              area={child}
              eventId={eventId}
              churchId={churchId}
              locale={locale}
              depth={depth + 1}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
