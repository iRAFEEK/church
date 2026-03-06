'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Users, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ministry, Group } from '@/types'

export interface ServiceNeedDraft {
  ministry_id?: string
  group_id?: string
  volunteers_needed: number
  notes: string
  notes_ar: string
  // For display only
  _name?: string
  _name_ar?: string
  _type?: 'ministry' | 'group'
}

interface ServiceNeedsPickerProps {
  serviceNeeds: ServiceNeedDraft[]
  onChange: (needs: ServiceNeedDraft[]) => void
}

export function ServiceNeedsPicker({ serviceNeeds, onChange }: ServiceNeedsPickerProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const [teamType, setTeamType] = useState<'ministry' | 'group'>('ministry')
  const [selectedId, setSelectedId] = useState('')
  const [volunteersNeeded, setVolunteersNeeded] = useState(1)
  const [notes, setNotes] = useState('')
  const [notesAr, setNotesAr] = useState('')

  useEffect(() => {
    fetch('/api/ministries').then(r => r.json()).then(d => setMinistries(d.data || []))
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.data || []))
  }, [])

  const openAddDialog = () => {
    setEditIndex(null)
    setTeamType('ministry')
    setSelectedId('')
    setVolunteersNeeded(1)
    setNotes('')
    setNotesAr('')
    setDialogOpen(true)
  }

  const openEditDialog = (index: number) => {
    const need = serviceNeeds[index]
    setEditIndex(index)
    setTeamType(need.ministry_id ? 'ministry' : 'group')
    setSelectedId(need.ministry_id || need.group_id || '')
    setVolunteersNeeded(need.volunteers_needed)
    setNotes(need.notes)
    setNotesAr(need.notes_ar)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!selectedId) return

    const team = teamType === 'ministry'
      ? ministries.find(m => m.id === selectedId)
      : groups.find(g => g.id === selectedId)

    const need: ServiceNeedDraft = {
      ...(teamType === 'ministry' ? { ministry_id: selectedId } : { group_id: selectedId }),
      volunteers_needed: volunteersNeeded,
      notes,
      notes_ar: notesAr,
      _name: team?.name || '',
      _name_ar: team?.name_ar || '',
      _type: teamType,
    }

    if (editIndex !== null) {
      const updated = [...serviceNeeds]
      updated[editIndex] = need
      onChange(updated)
    } else {
      // Check for duplicate
      const exists = serviceNeeds.some(n =>
        (teamType === 'ministry' && n.ministry_id === selectedId) ||
        (teamType === 'group' && n.group_id === selectedId)
      )
      if (exists) return
      onChange([...serviceNeeds, need])
    }

    setDialogOpen(false)
  }

  const handleRemove = (index: number) => {
    onChange(serviceNeeds.filter((_, i) => i !== index))
  }

  // Filter out already-selected teams
  const availableMinistries = ministries.filter(m =>
    m.is_active && (editIndex !== null || !serviceNeeds.some(n => n.ministry_id === m.id))
  )
  const availableGroups = groups.filter(g =>
    g.is_active && (editIndex !== null || !serviceNeeds.some(n => n.group_id === g.id))
  )

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-500">
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">{t('serviceNeeds')}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4 me-1" />
          {t('addServiceNeed')}
        </Button>
      </div>

      {serviceNeeds.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
          {t('noServiceNeeds')}
        </div>
      ) : (
        <div className="space-y-2">
          {serviceNeeds.map((need, i) => {
            const name = isRTL ? (need._name_ar || need._name) : need._name
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
                  <p className="text-xs text-zinc-500">
                    {need._type === 'ministry' ? t('ministry') : t('group')} &middot;{' '}
                    {need.volunteers_needed} {t('volunteersNeeded').toLowerCase()}
                  </p>
                  {(need.notes || need.notes_ar) && (
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">
                      {isRTL ? (need.notes_ar || need.notes) : (need.notes || need.notes_ar)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditDialog(i)}
                    className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? t('editServiceNeed') : t('addServiceNeed')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Ministry or Group toggle */}
            <div>
              <Label className="text-sm text-zinc-500 mb-2 block">{t('selectMinistryOrGroup')}</Label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => { setTeamType('ministry'); setSelectedId('') }}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all',
                    teamType === 'ministry'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  )}
                >
                  {t('ministry')}
                </button>
                <button
                  type="button"
                  onClick={() => { setTeamType('group'); setSelectedId('') }}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all',
                    teamType === 'group'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  )}
                >
                  {t('group')}
                </button>
              </div>

              {/* Team selector */}
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm"
              >
                <option value="">{t('selectMinistryOrGroup')}</option>
                {teamType === 'ministry'
                  ? availableMinistries.map(m => (
                      <option key={m.id} value={m.id}>
                        {isRTL ? (m.name_ar || m.name) : m.name}
                      </option>
                    ))
                  : availableGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {isRTL ? (g.name_ar || g.name) : g.name}
                      </option>
                    ))
                }
              </select>
            </div>

            {/* Volunteers needed */}
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('volunteersNeeded')}</Label>
              <Input
                type="number"
                min={1}
                value={volunteersNeeded}
                onChange={(e) => setVolunteersNeeded(Math.max(1, parseInt(e.target.value) || 1))}
                dir="ltr"
                className="min-h-[44px]"
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('serviceNotes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                dir="ltr"
                placeholder="e.g., 2 camera operators, 1 sound engineer"
              />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('serviceNotesAr')}</Label>
              <Textarea
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                rows={2}
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!selectedId}
              className="w-full"
            >
              {editIndex !== null ? t('editServiceNeed') : t('addServiceNeed')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
