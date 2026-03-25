'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Users, CheckSquare, Package, Megaphone, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  role: string
  checkin_status: string
  shift_start: string | null
  shift_end: string | null
  profile: {
    id: string
    first_name: string
    last_name: string
    first_name_ar?: string | null
    last_name_ar?: string | null
    phone?: string | null
  } | null
}

interface TeamTask {
  id: string
  title: string
  status: string
  priority: string
  due_at: string | null
}

interface TeamResource {
  id: string
  name: string
  name_ar: string | null
  resource_type: string
  status: string
  quantity_needed: number | null
  estimated_cost: number | null
}

interface TeamBroadcast {
  id: string
  message: string
  message_ar: string | null
  is_urgent: boolean
  scope: string
  created_at: string
  sender: { first_name: string; last_name: string; first_name_ar?: string | null; last_name_ar?: string | null } | null
}

interface Props {
  eventId: string
  team: {
    id: string
    name: string
    name_ar: string | null
    muster_point: string | null
    muster_point_ar: string | null
    target_headcount: number | null
    area_id: string | null
  }
  members: TeamMember[]
  tasks: TeamTask[]
  resources: TeamResource[]
  broadcasts: TeamBroadcast[]
  locale: string
}

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

export function ConferenceTeamDashboard({ eventId, team, members, tasks, resources, broadcasts, locale }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')
  const [taskList, setTaskList] = useState<TeamTask[]>(tasks)

  const teamName = isRTL ? (team.name_ar || team.name) : team.name
  const musterPoint = isRTL ? (team.muster_point_ar || team.muster_point) : team.muster_point

  const getProfileName = (profile: TeamMember['profile']) => {
    if (!profile) return '—'
    if (isRTL && (profile.first_name_ar || profile.last_name_ar)) {
      return `${profile.first_name_ar || ''} ${profile.last_name_ar || ''}`.trim()
    }
    return `${profile.first_name} ${profile.last_name}`.trim()
  }

  const getSenderName = (sender: TeamBroadcast['sender']) => {
    if (!sender) return '—'
    if (isRTL && (sender.first_name_ar || sender.last_name_ar)) {
      return `${sender.first_name_ar || ''} ${sender.last_name_ar || ''}`.trim()
    }
    return `${sender.first_name} ${sender.last_name}`.trim()
  }

  const handleMarkTaskDone = async (taskId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/conference/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (!res.ok) throw new Error()
      setTaskList((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'done' } : t))
    } catch {
      toast.error('Failed to update task')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{teamName}</h2>
        {musterPoint && (
          <p className="text-sm text-muted-foreground mt-0.5">{t('musterPoint')}: {musterPoint}</p>
        )}
        {team.target_headcount && (
          <p className="text-sm text-muted-foreground">
            {t('targetHeadcount')}: <span dir="ltr">{team.target_headcount}</span>
          </p>
        )}
      </div>

      {/* 2x2 grid on desktop, single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Members panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('teamMembers')}
              <span className="ms-auto text-muted-foreground font-normal" dir="ltr">{members.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('noVolunteers')}</p>
            )}
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{getProfileName(member.profile)}</p>
                  <p className="text-xs text-muted-foreground">{t(member.role as Parameters<typeof t>[0])}</p>
                </div>
                <Badge className={cn('text-xs shrink-0', CHECKIN_COLORS[member.checkin_status] || '')}>
                  {t(member.checkin_status === 'not_arrived' ? 'notArrived' : member.checkin_status === 'checked_in' ? 'checkedIn' : member.checkin_status === 'checked_out' ? 'checkedOut' : 'noShow')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasks panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {t('teamTasks')}
              <span className="ms-auto text-muted-foreground font-normal" dir="ltr">{taskList.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {taskList.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('noTasks')}</p>
            )}
            {taskList.map((task) => (
              <div key={task.id} className="flex items-center gap-2 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', task.status === 'done' && 'line-through text-muted-foreground')}>
                    {task.title}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    <Badge className={cn('text-xs', STATUS_COLORS[task.status] || '')}>
                      {t(task.status === 'open' ? 'taskOpen' : task.status === 'in_progress' ? 'taskInProgress' : task.status === 'blocked' ? 'taskBlocked' : 'taskDone')}
                    </Badge>
                    {task.status === 'blocked' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 self-center" />
                    )}
                  </div>
                </div>
                {task.status !== 'done' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs shrink-0"
                    onClick={() => handleMarkTaskDone(task.id)}
                  >
                    {t('markDone')}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resources panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('teamResources')}
              <span className="ms-auto text-muted-foreground font-normal" dir="ltr">{resources.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resources.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('noResources')}</p>
            )}
            {resources.map((res) => (
              <div key={res.id} className="flex items-center gap-2 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{isRTL ? (res.name_ar || res.name) : res.name}</p>
                  <p className="text-xs text-muted-foreground">{t(res.resource_type as Parameters<typeof t>[0])}</p>
                </div>
                {res.quantity_needed && (
                  <span className="text-xs text-muted-foreground shrink-0" dir="ltr">×{res.quantity_needed}</span>
                )}
                <Badge variant="outline" className="text-xs shrink-0">
                  {t(`resource${res.status.charAt(0).toUpperCase()}${res.status.slice(1)}` as Parameters<typeof t>[0])}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Broadcasts panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              {t('teamBroadcasts')}
              <span className="ms-auto text-muted-foreground font-normal" dir="ltr">{broadcasts.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {broadcasts.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('noBroadcasts')}</p>
            )}
            {broadcasts.map((bc) => (
              <div
                key={bc.id}
                className={cn(
                  'rounded-lg border p-3 space-y-1',
                  bc.is_urgent && 'border-red-200 bg-red-50'
                )}
              >
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1">{isRTL && bc.message_ar ? bc.message_ar : bc.message}</p>
                  {bc.is_urgent && (
                    <Badge className="shrink-0 bg-red-100 text-red-700 text-xs">{t('urgentBroadcast')}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {getSenderName(bc.sender)} · {new Date(bc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
