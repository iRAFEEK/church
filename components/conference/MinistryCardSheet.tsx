'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Bell, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConferenceBoardCardWithDetails } from '@/types'

interface Props {
  card: ConferenceBoardCardWithDetails
  eventId: string
  churchId: string
  ministries: Array<{ id: string; name: string; name_ar: string | null }>
  locale: string
  onClose: () => void
  onUpdate: (card: Partial<ConferenceBoardCardWithDetails> & { id: string }) => void
}

const STATUSES = ['planning', 'leader_notified', 'in_progress', 'ready'] as const

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-zinc-100 text-zinc-700',
  leader_notified: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  ready: 'bg-green-100 text-green-700',
}

export function MinistryCardSheet({ card, eventId, churchId, ministries, locale, onClose, onUpdate }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const [customName, setCustomName] = useState(card.custom_name || '')
  const [headcount, setHeadcount] = useState(String(card.headcount_target || ''))
  const [status, setStatus] = useState(card.status)
  const [notifying, setNotifying] = useState(false)
  const [saving, setSaving] = useState(false)

  // Tasks state
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; priority: string }>>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  // Resources state
  const [resources, setResources] = useState<Array<{ id: string; name: string; resource_type: string; status: string; quantity_needed: number | null }>>([])
  const [newResourceName, setNewResourceName] = useState('')
  const [addingResource, setAddingResource] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Fetch tasks and resources for this card
    async function loadData() {
      const [tasksRes, resourcesRes] = await Promise.all([
        fetch(`/api/events/${eventId}/conference/tasks?card_id=${card.id}`),
        fetch(`/api/events/${eventId}/conference/resources?card_id=${card.id}`),
      ])
      if (tasksRes.ok) {
        const { data } = await tasksRes.json()
        setTasks(data || [])
      }
      if (resourcesRes.ok) {
        const { data } = await resourcesRes.json()
        setResources(data || [])
      }
    }
    loadData()
  }, [card.id, eventId])

  const handleAutoSave = (updates: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await fetch(
          `/api/events/${eventId}/conference/board/cards/${card.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          }
        )
        if (!res.ok) throw new Error()
      } catch {
        toast.error('Failed to save')
      } finally {
        setSaving(false)
      }
    }, 800)
  }

  const handleNotifyLeader = async () => {
    setNotifying(true)
    try {
      const res = await fetch(
        `/api/events/${eventId}/conference/board/cards/${card.id}/notify-leader`,
        { method: 'POST' }
      )
      if (!res.ok) throw new Error()
      toast.success(t('leaderNotified'))
      setStatus('leader_notified')
      handleAutoSave({ status: 'leader_notified' })
    } catch {
      toast.error('Failed to notify leader')
    } finally {
      setNotifying(false)
    }
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          card_id: card.id,
          priority: 'normal',
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setTasks((prev) => [...prev, data])
      setNewTaskTitle('')
    } catch {
      toast.error('Failed to add task')
    } finally {
      setAddingTask(false)
    }
  }

  const handleAddResource = async () => {
    if (!newResourceName.trim()) return
    setAddingResource(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newResourceName.trim(),
          card_id: card.id,
          resource_type: 'other',
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setResources((prev) => [...prev, data])
      setNewResourceName('')
    } catch {
      toast.error('Failed to add resource')
    } finally {
      setAddingResource(false)
    }
  }

  const getCardName = () => {
    if (isRTL) return card.custom_name_ar || card.ministry?.name_ar || card.custom_name || card.ministry?.name || ''
    return card.custom_name || card.ministry?.name || card.custom_name_ar || card.ministry?.name_ar || ''
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[520px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="truncate">{getCardName() || t('ministryDetails')}</SheetTitle>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">{t('details')}</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1">{t('tasks')}</TabsTrigger>
            <TabsTrigger value="resources" className="flex-1">{t('resources')}</TabsTrigger>
          </TabsList>

          {/* Details tab */}
          <TabsContent value="details" className="space-y-4 pt-4">
            {/* Custom name */}
            <div className="space-y-1.5">
              <Label htmlFor="card-name">{t('ministryDetails')}</Label>
              <Input
                id="card-name"
                value={customName}
                dir="auto"
                className="text-base"
                onChange={(e) => {
                  setCustomName(e.target.value)
                  handleAutoSave({ custom_name: e.target.value })
                }}
                placeholder={isRTL ? 'اسم الخدمة' : 'Ministry name'}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>{t('status')}</Label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatus(s)
                      handleAutoSave({ status: s })
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px]',
                      status === s
                        ? cn('border-transparent', STATUS_COLORS[s])
                        : 'border-muted bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {t(`status${s.charAt(0).toUpperCase()}${s.slice(1).replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())}` as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>

            {/* Target headcount */}
            <div className="space-y-1.5">
              <Label htmlFor="headcount">{t('targetHeadcount')}</Label>
              <Input
                id="headcount"
                type="number"
                min="0"
                value={headcount}
                dir="ltr"
                className="text-base"
                onChange={(e) => {
                  setHeadcount(e.target.value)
                  const val = parseInt(e.target.value)
                  if (!isNaN(val)) handleAutoSave({ headcount_target: val })
                }}
              />
            </div>

            {/* Notify leader button */}
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleNotifyLeader}
              disabled={notifying}
            >
              {notifying ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Bell className="h-4 w-4 me-2" />
              )}
              {t('notifyLeader')}
            </Button>
          </TabsContent>

          {/* Tasks tab */}
          <TabsContent value="tasks" className="space-y-3 pt-4">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{t('noTasks')}</p>
            )}
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{task.title}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{task.status}</Badge>
                      <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                placeholder={t('taskTitle')}
                value={newTaskTitle}
                dir="auto"
                className="text-base flex-1"
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
              />
              <Button
                size="icon"
                className="shrink-0 h-10 w-10"
                onClick={handleAddTask}
                disabled={addingTask || !newTaskTitle.trim()}
                aria-label={t('addTask')}
              >
                {addingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>

          {/* Resources tab */}
          <TabsContent value="resources" className="space-y-3 pt-4">
            {resources.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{t('noResources')}</p>
            )}
            <div className="space-y-2">
              {resources.map((res) => (
                <div key={res.id} className="flex items-center gap-2 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{res.name}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{t(res.resource_type as Parameters<typeof t>[0])}</Badge>
                      <Badge variant="outline" className="text-xs">{t(`resource${res.status.charAt(0).toUpperCase()}${res.status.slice(1)}` as Parameters<typeof t>[0])}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                placeholder={t('resourceName')}
                value={newResourceName}
                dir="auto"
                className="text-base flex-1"
                onChange={(e) => setNewResourceName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddResource() }}
              />
              <Button
                size="icon"
                className="shrink-0 h-10 w-10"
                onClick={handleAddResource}
                disabled={addingResource || !newResourceName.trim()}
                aria-label={t('addResource')}
              >
                {addingResource ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
