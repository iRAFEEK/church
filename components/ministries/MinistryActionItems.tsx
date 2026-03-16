'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import {
  Plus, CheckCircle2, Circle, Loader2, CalendarDays,
  Trash2, User, ListTodo, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssignedProfile {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

interface ActionItem {
  id: string
  title: string
  status: 'open' | 'done'
  due_date: string | null
  meeting_id: string | null
  created_at: string
  assigned: AssignedProfile | null
  meeting: { id: string; title: string } | null
}

interface MinistryActionItemsProps {
  ministryId: string
  members: AssignedProfile[]
}

export function MinistryActionItems({ ministryId, members }: MinistryActionItemsProps) {
  const t = useTranslations('actionItems')
  const locale = useLocale()
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Inline add form
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/ministries/${ministryId}/action-items`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [ministryId])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function handleAdd() {
    if (!newTitle.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/ministries/${ministryId}/action-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          assigned_to: newAssignee || undefined,
          due_date: newDueDate || undefined,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setItems(prev => [json.data, ...prev])
        setNewTitle('')
        setNewAssignee('')
        setNewDueDate('')
        setShowAdd(false)
        toast.success(t('itemAdded'))
      } else {
        toast.error(t('itemError'))
      }
    } catch {
      toast.error(t('itemError'))
    } finally {
      setAdding(false)
    }
  }

  async function toggleItem(id: string, currentStatus: string) {
    setTogglingId(id)
    const newStatus = currentStatus === 'done' ? 'open' : 'done'
    try {
      const res = await fetch(`/api/ministries/${ministryId}/action-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, status: newStatus as 'open' | 'done' } : item
        ))
      }
    } catch {
      // silently fail
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteItem(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/ministries/${ministryId}/action-items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  const openItems = items.filter(i => i.status === 'open')
  const doneItems = items.filter(i => i.status === 'done')

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-zinc-100 rounded w-40" />
        <div className="h-16 bg-zinc-50 rounded-xl" />
        <div className="h-16 bg-zinc-50 rounded-xl" />
      </div>
    )
  }

  function renderItem(item: ActionItem) {
    const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'done'

    return (
      <div
        key={item.id}
        className={cn(
          'flex items-start gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 transition-colors',
          item.status === 'done' && 'opacity-60'
        )}
      >
        {/* Toggle */}
        <button
          onClick={() => toggleItem(item.id, item.status)}
          disabled={togglingId === item.id}
          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={item.status === 'done' ? t('markOpen') : t('markDone')}
        >
          {togglingId === item.id ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          ) : item.status === 'done' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-zinc-300 hover:text-zinc-400" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 py-2">
          <p className={cn(
            'text-sm font-medium',
            item.status === 'done' && 'line-through text-zinc-400'
          )}>
            {item.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {item.assigned && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={item.assigned.photo_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {(item.assigned.first_name_ar || item.assigned.first_name || '?')[0]}
                  </AvatarFallback>
                </Avatar>
                {item.assigned.first_name_ar || item.assigned.first_name}
              </span>
            )}
            {item.due_date && (
              <span className={cn(
                'text-xs flex items-center gap-0.5',
                isOverdue ? 'text-red-500 font-medium' : 'text-zinc-400'
              )}>
                <CalendarDays className="h-3 w-3" />
                {new Date(item.due_date).toLocaleDateString(
                  locale === 'en' ? 'en-US' : 'ar-EG',
                  { month: 'short', day: 'numeric' }
                )}
              </span>
            )}
            {item.meeting && (
              <span className="text-xs text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                {item.meeting.title}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => deleteItem(item.id)}
          disabled={deletingId === item.id}
          className="shrink-0 min-h-[44px] min-w-[36px] flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors"
          aria-label={t('deleteItem')}
        >
          {deletingId === item.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          {t('title')}
          {openItems.length > 0 && (
            <span className="text-sm font-normal text-zinc-400">({openItems.length})</span>
          )}
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="min-h-[36px]"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-4 w-4 me-1" />
          {t('addTask')}
        </Button>
      </div>

      {/* Inline Add Form */}
      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-3 space-y-3">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            dir="auto"
            className="min-h-[44px] bg-white"
            placeholder={t('taskPlaceholder')}
            onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) handleAdd() }}
            autoFocus
          />
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                <User className="h-3 w-3" /> {t('assignTo')}
              </label>
              <select
                value={newAssignee}
                onChange={e => setNewAssignee(e.target.value)}
                className="h-[44px] w-full rounded-md border border-zinc-200 px-2 text-sm bg-white"
              >
                <option value="">{t('unassigned')}</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.first_name_ar || m.first_name} {m.last_name_ar || m.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[160px] shrink-0">
              <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                <CalendarDays className="h-3 w-3" /> {t('dueDate')}
              </label>
              <Input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="h-[44px] bg-white"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowAdd(false); setNewTitle(''); setNewAssignee(''); setNewDueDate('') }}
              className="min-h-[36px]"
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newTitle.trim() || adding}
              className="min-h-[36px]"
            >
              {adding && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
              {t('addTask')}
            </Button>
          </div>
        </div>
      )}

      {/* Open Items */}
      {openItems.length === 0 && doneItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center">
          <ListTodo className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
          <p className="text-sm text-zinc-400">{t('empty')}</p>
          <p className="text-xs text-zinc-300 mt-1">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {openItems.map(renderItem)}
        </div>
      )}

      {/* Done Items (collapsible) */}
      {doneItems.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 min-h-[44px] transition-colors"
          >
            {showDone ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {t('completedCount', { count: doneItems.length })}
          </button>
          {showDone && (
            <div className="space-y-2 mt-2">
              {doneItems.map(renderItem)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
