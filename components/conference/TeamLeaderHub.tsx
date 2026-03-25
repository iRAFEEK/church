'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Users,
  CheckSquare,
  Package,
  Megaphone,
  AlertTriangle,
  ChevronLeft,
  Clock,
  Loader2,
  Send,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  role: string
  checkin_status: string
  checked_in_at: string | null
  checked_out_at: string | null
  shift_start: string | null
  shift_end: string | null
  task_notes: string | null
  profile: {
    id: string
    first_name: string
    last_name: string
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
}

interface TeamTask {
  id: string
  title: string
  title_ar: string | null
  status: string
  priority: string
  assignee_id: string | null
  due_at: string | null
  created_at: string
}

interface TeamResource {
  id: string
  name: string
  name_ar: string | null
  resource_type: string
  quantity: number | null
  unit: string | null
  status: string
  notes: string | null
  created_at: string
}

interface TeamBroadcast {
  id: string
  message: string
  message_ar: string | null
  is_urgent: boolean
  created_at: string
  sender: {
    first_name: string
    last_name: string
    first_name_ar: string | null
    last_name_ar: string | null
  } | null
}

interface Props {
  eventId: string
  teamId: string
  membershipId: string
  myRole: string
  myShiftStart: string | null
  myShiftEnd: string | null
  event: {
    id: string
    title: string
    title_ar: string | null
    starts_at: string | null
    ends_at: string | null
  }
  team: {
    id: string
    name: string
    name_ar: string | null
    target_headcount: number | null
    area_id: string
    sort_order: number
  }
  initialMembers: TeamMember[]
  initialTasks: TeamTask[]
  initialResources: TeamResource[]
  initialBroadcasts: TeamBroadcast[]
  locale: string
  isAdmin: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKIN_COLORS: Record<string, string> = {
  not_arrived: 'bg-zinc-100 text-zinc-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-blue-100 text-blue-700',
  no_show: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-zinc-100 text-zinc-700',
  in_progress: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

const RESOURCE_STATUS_COLORS: Record<string, string> = {
  needed: 'bg-zinc-100 text-zinc-700',
  requested: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
}

const PRIORITY_ICONS: Record<string, string> = {
  critical: '🔴',
  high: '🟡',
  normal: '⚪',
  low: '🔵',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProfileName(
  profile: TeamMember['profile'],
  isRTL: boolean,
): string {
  if (!profile) return '—'
  if (isRTL && (profile.first_name_ar || profile.last_name_ar)) {
    return `${profile.first_name_ar ?? ''} ${profile.last_name_ar ?? ''}`.trim()
  }
  return `${profile.first_name} ${profile.last_name}`.trim()
}

function getSenderName(
  sender: TeamBroadcast['sender'],
  isRTL: boolean,
): string {
  if (!sender) return '—'
  if (isRTL && (sender.first_name_ar || sender.last_name_ar)) {
    return `${sender.first_name_ar ?? ''} ${sender.last_name_ar ?? ''}`.trim()
  }
  return `${sender.first_name} ${sender.last_name}`.trim()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MembersTabProps {
  members: TeamMember[]
  eventId: string
  isRTL: boolean
  onMemberUpdate: (memberId: string, updates: Partial<TeamMember>) => void
}

function MembersTab({ members, eventId, isRTL, onMemberUpdate }: MembersTabProps) {
  const t = useTranslations('conference')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const checkedInCount = members.filter((m) => m.checkin_status === 'checked_in').length

  const handleCheckin = async (member: TeamMember) => {
    if (pendingIds.has(member.id)) return

    const newStatus =
      member.checkin_status === 'checked_in' ? 'checked_out' : 'checked_in'

    // Optimistic update
    onMemberUpdate(member.id, { checkin_status: newStatus })
    setPendingIds((prev) => new Set(prev).add(member.id))

    try {
      const res = await fetch(`/api/events/${eventId}/conference/checkin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id, status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success(
        newStatus === 'checked_in' ? t('checkedInSuccess') : t('checkOut'),
      )
    } catch {
      // Roll back
      onMemberUpdate(member.id, { checkin_status: member.checkin_status })
      toast.error(t('errorSaving'))
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(member.id)
        return next
      })
    }
  }

  const getCheckinLabel = (status: string) => {
    switch (status) {
      case 'not_arrived': return t('notArrived')
      case 'checked_in': return t('checkedIn')
      case 'checked_out': return t('checkedOut')
      case 'no_show': return t('noShow')
      default: return status
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress counter */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
        <span className="text-sm text-muted-foreground">{t('progressLabel', { checked: checkedInCount, total: members.length })}</span>
        <span className="text-sm font-semibold" dir="ltr">
          {checkedInCount} / {members.length}
        </span>
      </div>

      {members.length === 0 && (
        <div className="text-center py-10">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">{t('noVolunteers')}</p>
        </div>
      )}

      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-3 rounded-xl border p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {getProfileName(member.profile, isRTL)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-xs">
                {t(member.role as Parameters<typeof t>[0])}
              </Badge>
              {(member.shift_start || member.shift_end) && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5" dir="ltr">
                  <Clock className="h-3 w-3 inline-block" />
                  {member.shift_start ? formatTime(member.shift_start) : ''}
                  {member.shift_end ? ` – ${formatTime(member.shift_end)}` : ''}
                </span>
              )}
            </div>
          </div>

          <Badge className={cn('text-xs shrink-0', CHECKIN_COLORS[member.checkin_status] ?? '')}>
            {getCheckinLabel(member.checkin_status)}
          </Badge>

          <Button
            size="sm"
            variant={member.checkin_status === 'checked_in' ? 'outline' : 'default'}
            className="h-9 px-3 text-xs shrink-0"
            disabled={pendingIds.has(member.id)}
            onClick={() => handleCheckin(member)}
            aria-label={
              member.checkin_status === 'checked_in'
                ? `${t('checkOut')} ${getProfileName(member.profile, isRTL)}`
                : `${t('checkIn')} ${getProfileName(member.profile, isRTL)}`
            }
          >
            {pendingIds.has(member.id) ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : member.checkin_status === 'checked_in' ? (
              t('checkOut')
            ) : (
              t('checkIn')
            )}
          </Button>
        </div>
      ))}
    </div>
  )
}

interface TasksTabProps {
  tasks: TeamTask[]
  eventId: string
  isRTL: boolean
  isAdmin: boolean
  teamId: string
  onTaskUpdate: (taskId: string, updates: Partial<TeamTask>) => void
  onTaskAdd: (task: TeamTask) => void
}

function TasksTab({ tasks, eventId, isRTL, isAdmin, teamId, onTaskUpdate, onTaskAdd }: TasksTabProps) {
  const t = useTranslations('conference')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('normal')
  const [isAdding, setIsAdding] = useState(false)

  const nextStatus = (current: string): string => {
    switch (current) {
      case 'open': return 'in_progress'
      case 'in_progress': return 'done'
      default: return 'open'
    }
  }

  const handleStatusCycle = async (task: TeamTask) => {
    if (pendingIds.has(task.id)) return
    const newStatus = nextStatus(task.status)

    // Optimistic update
    onTaskUpdate(task.id, { status: newStatus })
    setPendingIds((prev) => new Set(prev).add(task.id))

    try {
      const res = await fetch(
        `/api/events/${eventId}/conference/tasks/${task.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        },
      )
      if (!res.ok) throw new Error()
    } catch {
      onTaskUpdate(task.id, { status: task.status })
      toast.error(t('errorSaving'))
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  const handleAddTask = async () => {
    if (!newTitle.trim() || isAdding) return
    setIsAdding(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: newPriority,
          team_id: teamId,
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json() as { data: TeamTask }
      onTaskAdd(data)
      setNewTitle('')
      setNewPriority('normal')
      setShowAddForm(false)
      toast.success(t('addTask'))
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setIsAdding(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return t('taskOpen')
      case 'in_progress': return t('taskInProgress')
      case 'blocked': return t('taskBlocked')
      case 'done': return t('taskDone')
      default: return status
    }
  }

  const getNextStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return t('taskInProgress')
      case 'in_progress': return t('taskDone')
      default: return t('taskOpen')
    }
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => setShowAddForm((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {t('addTask')}
        </Button>
      )}

      {showAddForm && isAdmin && (
        <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label htmlFor="new-task-title">{t('taskTitle')}</Label>
            <Input
              id="new-task-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              dir="auto"
              className="h-11 text-base"
              placeholder={isRTL ? 'عنوان المهمة...' : 'Task title...'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-task-priority">{t('priority')}</Label>
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger id="new-task-priority" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">{t('priorityCritical')}</SelectItem>
                <SelectItem value="high">{t('priorityHigh')}</SelectItem>
                <SelectItem value="normal">{t('priorityNormal')}</SelectItem>
                <SelectItem value="low">{t('priorityLow')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-9"
              disabled={!newTitle.trim() || isAdding}
              onClick={handleAddTask}
            >
              {isAdding && <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />}
              {t('addTask')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9"
              onClick={() => setShowAddForm(false)}
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-10">
          <CheckSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">{t('noTasks')}</p>
        </div>
      )}

      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 rounded-xl border p-3">
          <span className="text-base shrink-0" aria-hidden="true">
            {PRIORITY_ICONS[task.priority] ?? '⚪'}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm font-medium truncate',
                task.status === 'done' && 'line-through text-muted-foreground',
              )}
            >
              {isRTL && task.title_ar ? task.title_ar : task.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Badge className={cn('text-xs', STATUS_COLORS[task.status] ?? '')}>
                {getStatusLabel(task.status)}
              </Badge>
              {task.status === 'blocked' && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
              {task.due_at && (
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {new Date(task.due_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {task.status !== 'done' && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-2 text-xs shrink-0"
              disabled={pendingIds.has(task.id)}
              onClick={() => handleStatusCycle(task)}
              aria-label={`${getNextStatusLabel(task.status)}: ${task.title}`}
            >
              {pendingIds.has(task.id) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                getNextStatusLabel(task.status)
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

interface ResourcesTabProps {
  resources: TeamResource[]
  isRTL: boolean
}

function ResourcesTab({ resources, isRTL }: ResourcesTabProps) {
  const t = useTranslations('conference')

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'needed': return t('resourceNeeded')
      case 'requested': return t('resourceRequested')
      case 'confirmed': return t('resourceConfirmed')
      case 'delivered': return t('resourceDelivered')
      default: return status
    }
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-10">
        <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">{t('noResources')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => (
        <div key={resource.id} className="flex items-center gap-3 rounded-xl border p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {isRTL && resource.name_ar ? resource.name_ar : resource.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(resource.resource_type as Parameters<typeof t>[0])}
              {resource.quantity != null && (
                <span dir="ltr"> · {resource.quantity}{resource.unit ? ` ${resource.unit}` : ''}</span>
              )}
            </p>
            {resource.notes && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{resource.notes}</p>
            )}
          </div>
          <Badge className={cn('text-xs shrink-0', RESOURCE_STATUS_COLORS[resource.status] ?? '')}>
            {getStatusLabel(resource.status)}
          </Badge>
        </div>
      ))}
    </div>
  )
}

interface BroadcastsTabProps {
  broadcasts: TeamBroadcast[]
  eventId: string
  teamId: string
  isRTL: boolean
}

function BroadcastsTab({ broadcasts, eventId, teamId, isRTL }: BroadcastsTabProps) {
  const t = useTranslations('conference')
  const [broadcastList, setBroadcastList] = useState<TeamBroadcast[]>(broadcasts)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          is_urgent: isUrgent,
          team_id: teamId,
          scope: 'team',
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json() as { data: TeamBroadcast }
      setBroadcastList((prev) => [data, ...prev])
      setMessage('')
      setIsUrgent(false)
      setSheetOpen(false)
      toast.success(t('sendBroadcast'))
    } catch {
      toast.error(t('errorSaving'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => setSheetOpen(true)}
      >
        <Send className="h-4 w-4" />
        {t('sendBroadcast')}
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>{t('sendBroadcast')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-msg">{t('broadcastMessage')}</Label>
              <Textarea
                id="broadcast-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                dir="auto"
                className="text-base min-h-[100px]"
                placeholder={isRTL ? 'نص الرسالة...' : 'Message text...'}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="urgent-toggle"
                checked={isUrgent}
                onCheckedChange={setIsUrgent}
              />
              <Label htmlFor="urgent-toggle" className="flex items-center gap-1.5 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {t('isUrgent')}
              </Label>
            </div>
            <Button
              className="w-full h-11"
              disabled={!message.trim() || sending}
              onClick={handleSend}
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {sending ? t('sending') : t('sendBroadcast')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {broadcastList.length === 0 && (
        <div className="text-center py-10">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">{t('noBroadcasts')}</p>
        </div>
      )}

      {broadcastList.map((bc) => (
        <div
          key={bc.id}
          className={cn(
            'rounded-xl border p-4 space-y-2',
            bc.is_urgent && 'border-red-200 bg-red-50',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium flex-1">
              {isRTL && bc.message_ar ? bc.message_ar : bc.message}
            </p>
            {bc.is_urgent && (
              <Badge className="shrink-0 bg-red-100 text-red-700 text-xs">
                {t('urgentBroadcast')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {getSenderName(bc.sender, isRTL)} ·{' '}
            {formatTime(bc.created_at)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TeamLeaderHub({
  eventId,
  teamId,
  myRole,
  myShiftStart,
  myShiftEnd,
  team,
  initialMembers,
  initialTasks,
  initialResources,
  initialBroadcasts,
  locale,
  isAdmin,
}: Props) {
  const t = useTranslations('conference')
  const router = useRouter()
  const isRTL = locale.startsWith('ar')

  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [tasks, setTasks] = useState<TeamTask[]>(initialTasks)

  const teamName = isRTL ? (team.name_ar ?? team.name) : team.name

  const handleMemberUpdate = (memberId: string, updates: Partial<TeamMember>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m)),
    )
  }

  const handleTaskUpdate = (taskId: string, updates: Partial<TeamTask>) => {
    setTasks((prev) =>
      prev.map((tk) => (tk.id === taskId ? { ...tk, ...updates } : tk)),
    )
  }

  const handleTaskAdd = (task: TeamTask) => {
    setTasks((prev) => [...prev, task])
  }

  const getRoleBadgeLabel = (role: string) => {
    switch (role) {
      case 'team_leader': return t('teamLeader')
      case 'sub_leader': return t('subLeader')
      case 'area_director': return t('areaDirector')
      case 'conference_director': return t('conferenceDirector')
      default: return role
    }
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 -ms-2"
            onClick={() => router.back()}
            aria-label={t('backToEvent')}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <h1 className="text-lg font-bold flex-1 truncate">{teamName}</h1>
          <Badge variant="secondary" className="text-xs shrink-0">
            {getRoleBadgeLabel(myRole)}
          </Badge>
        </div>
        {(myShiftStart || myShiftEnd) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground ps-7">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{t('myShift')}:</span>
            <span dir="ltr">
              {myShiftStart ? formatTime(myShiftStart) : ''}
              {myShiftEnd ? ` – ${formatTime(myShiftEnd)}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="w-full rounded-none border-b bg-background h-11 px-4">
          <TabsTrigger value="members" className="flex-1 text-xs sm:text-sm gap-1.5">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('teamMembers')}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 text-xs sm:text-sm gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('tasks')}
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex-1 text-xs sm:text-sm gap-1.5">
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('resources')}
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="flex-1 text-xs sm:text-sm gap-1.5">
            <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('broadcasts')}
          </TabsTrigger>
        </TabsList>

        <div className="p-4">
          <TabsContent value="members" className="mt-0">
            <MembersTab
              members={members}
              eventId={eventId}
              isRTL={isRTL}
              onMemberUpdate={handleMemberUpdate}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-0">
            <TasksTab
              tasks={tasks}
              eventId={eventId}
              isRTL={isRTL}
              isAdmin={isAdmin}
              teamId={teamId}
              onTaskUpdate={handleTaskUpdate}
              onTaskAdd={handleTaskAdd}
            />
          </TabsContent>

          <TabsContent value="resources" className="mt-0">
            <ResourcesTab resources={initialResources} isRTL={isRTL} />
          </TabsContent>

          <TabsContent value="broadcasts" className="mt-0">
            <BroadcastsTab
              broadcasts={initialBroadcasts}
              eventId={eventId}
              teamId={teamId}
              isRTL={isRTL}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
