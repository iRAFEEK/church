'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Calendar, MapPin, CheckCircle2, Circle, Loader2, Clock, Trash2, CalendarDays, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionItem {
  id: string
  title: string
  status: 'open' | 'done'
  due_date: string | null
  assigned: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
}

interface Meeting {
  id: string
  title: string
  scheduled_at: string
  location: string | null
  notes: string | null
  status: string
  created_at: string
  ministry_action_items: ActionItem[]
}

interface MinistryMeetingsProps {
  ministryId: string
  members: Array<{
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  }>
}

export function MinistryMeetings({ ministryId, members }: MinistryMeetingsProps) {
  const t = useTranslations('ministryMeetings')
  const locale = useLocale()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [togglingItem, setTogglingItem] = useState<string | null>(null)

  // New meeting form
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [actionItems, setActionItems] = useState<Array<{ title: string; assigned_to?: string; due_date?: string }>>([])

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(`/api/ministries/${ministryId}/meetings`)
      if (res.ok) {
        const json = await res.json()
        setMeetings(json.data || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [ministryId])

  useEffect(() => { fetchMeetings() }, [fetchMeetings])

  async function handleCreate() {
    if (!title || !scheduledAt) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/ministries/${ministryId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scheduled_at: new Date(scheduledAt).toISOString(),
          location: location || undefined,
          notes: notes || undefined,
          action_items: actionItems.filter(a => a.title.trim()),
        }),
      })
      if (res.ok) {
        toast.success(t('meetingCreated'))
        setDialogOpen(false)
        setTitle('')
        setScheduledAt('')
        setLocation('')
        setNotes('')
        setActionItems([])
        fetchMeetings()
      } else {
        toast.error(t('meetingError'))
      }
    } catch {
      toast.error(t('meetingError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActionItem(itemId: string, currentStatus: string) {
    setTogglingItem(itemId)
    const newStatus = currentStatus === 'done' ? 'open' : 'done'
    try {
      const res = await fetch(`/api/ministries/${ministryId}/meetings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_item_id: itemId, status: newStatus }),
      })
      if (res.ok) {
        setMeetings(prev => prev.map(m => ({
          ...m,
          ministry_action_items: m.ministry_action_items.map(a =>
            a.id === itemId ? { ...a, status: newStatus as 'open' | 'done' } : a
          ),
        })))
      }
    } catch {
      // silently fail
    } finally {
      setTogglingItem(null)
    }
  }

  function addActionItem() {
    setActionItems(prev => [...prev, { title: '' }])
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-zinc-100 rounded w-32" />
        <div className="h-24 bg-zinc-50 rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t('title')}</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="min-h-[36px]">
              <Plus className="h-4 w-4 me-1" />
              {t('newMeeting')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('newMeeting')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>{t('meetingTitle')}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  dir="auto"
                  className="min-h-[44px]"
                  placeholder={t('meetingTitlePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('dateTime')}</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="min-h-[44px]"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>{t('location')}</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  dir="auto"
                  className="min-h-[44px]"
                  placeholder={t('locationPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('notes')}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  dir="auto"
                  rows={3}
                />
              </div>

              {/* Action Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('actionItems')}
                  </Label>
                  <Button type="button" size="sm" variant="ghost" onClick={addActionItem} className="min-h-[36px]">
                    <Plus className="h-3 w-3 me-1" /> {t('addItem')}
                  </Button>
                </div>
                {actionItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-zinc-200 p-3 mb-2 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={item.title}
                        onChange={(e) => {
                          const next = [...actionItems]
                          next[idx] = { ...next[idx], title: e.target.value }
                          setActionItems(next)
                        }}
                        dir="auto"
                        className="min-h-[44px] flex-1"
                        placeholder={t('actionItemPlaceholder')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-[44px] w-[44px] shrink-0 text-zinc-400 hover:text-red-500"
                        onClick={() => setActionItems(prev => prev.filter((_, i) => i !== idx))}
                        aria-label={t('removeItem')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                          <User className="h-3 w-3" /> {t('assignTo')}
                        </label>
                        <select
                          value={item.assigned_to || ''}
                          onChange={(e) => {
                            const next = [...actionItems]
                            next[idx] = { ...next[idx], assigned_to: e.target.value || undefined }
                            setActionItems(next)
                          }}
                          className="h-[44px] w-full rounded-md border border-zinc-200 px-2 text-sm"
                        >
                          <option value="">{t('unassigned')}</option>
                          {members.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.first_name_ar || m.first_name} {m.last_name_ar || m.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-[140px] shrink-0">
                        <label className="text-xs text-zinc-500 flex items-center gap-1 mb-1">
                          <CalendarDays className="h-3 w-3" /> {t('dueDate')}
                        </label>
                        <Input
                          type="date"
                          value={item.due_date || ''}
                          onChange={(e) => {
                            const next = [...actionItems]
                            next[idx] = { ...next[idx], due_date: e.target.value || undefined }
                            setActionItems(next)
                          }}
                          className="h-[44px]"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {actionItems.length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-2">{t('noActionItems')}</p>
                )}
              </div>

              <Button
                onClick={handleCreate}
                disabled={submitting || !title || !scheduledAt}
                className="w-full min-h-[44px]"
              >
                {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t('createMeeting')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center">
          <Calendar className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
          <p className="text-sm text-zinc-400">{t('noMeetings')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(meeting => {
            const isUpcoming = meeting.status === 'scheduled' && new Date(meeting.scheduled_at) > new Date()
            const openItems = meeting.ministry_action_items?.filter(a => a.status === 'open').length || 0

            return (
              <div key={meeting.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-zinc-900 truncate">{meeting.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(meeting.scheduled_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'ar-EG', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {meeting.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isUpcoming && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t('upcoming')}
                      </span>
                    )}
                    {openItems > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full">
                        {openItems} {t('openItems')}
                      </span>
                    )}
                  </div>
                </div>

                {meeting.notes && (
                  <p className="text-sm text-zinc-600 mt-2">{meeting.notes}</p>
                )}

                {/* Action Items */}
                {meeting.ministry_action_items?.length > 0 && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 space-y-1">
                    <p className="text-xs font-medium text-zinc-500 mb-2">{t('actionItems')} ({meeting.ministry_action_items.length})</p>
                    {meeting.ministry_action_items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 rounded-lg hover:bg-zinc-50 transition-colors">
                        <button
                          onClick={() => toggleActionItem(item.id, item.status)}
                          disabled={togglingItem === item.id}
                          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label={item.status === 'done' ? t('markOpen') : t('markDone')}
                        >
                          {togglingItem === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                          ) : item.status === 'done' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-zinc-300" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            'text-sm block',
                            item.status === 'done' && 'line-through text-zinc-400'
                          )}>
                            {item.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.assigned && (
                              <span className="text-xs text-zinc-400 flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={item.assigned.photo_url || undefined} />
                                  <AvatarFallback className="text-[8px]">
                                    {(item.assigned.first_name_ar || item.assigned.first_name || '?')[0]}
                                  </AvatarFallback>
                                </Avatar>
                                {item.assigned.first_name_ar || item.assigned.first_name} {item.assigned.last_name_ar || item.assigned.last_name}
                              </span>
                            )}
                            {item.due_date && (
                              <span className={cn(
                                'text-xs flex items-center gap-0.5',
                                new Date(item.due_date) < new Date() && item.status !== 'done'
                                  ? 'text-red-500'
                                  : 'text-zinc-400'
                              )}>
                                <CalendarDays className="h-3 w-3" />
                                {new Date(item.due_date).toLocaleDateString(locale === 'en' ? 'en-US' : 'ar-EG', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
