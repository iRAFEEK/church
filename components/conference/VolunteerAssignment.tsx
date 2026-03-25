'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle2, Clock, MapPin, Megaphone, CheckSquare, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  eventId: string
  event: {
    title: string
    title_ar: string | null
    starts_at: string
    ends_at: string | null
  }
  membership: {
    id: string
    role: string
    checkin_status: string
    shift_start: string | null
    shift_end: string | null
    team_id: string
  }
  team: {
    id: string
    name: string
    name_ar: string | null
    muster_point: string | null
    muster_point_ar: string | null
    target_headcount: number | null
  } | null
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    due_at: string | null
  }>
  broadcasts: Array<{
    id: string
    message: string
    message_ar: string | null
    is_urgent: boolean
    scope: string
    created_at: string
  }>
  locale: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-zinc-100 text-zinc-700',
  in_progress: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

export function VolunteerAssignment({ eventId, event, membership, team, tasks, broadcasts, locale }: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const [checkinStatus, setCheckinStatus] = useState(membership.checkin_status)
  const [checkingIn, setCheckingIn] = useState(false)
  const [timeUntilShift, setTimeUntilShift] = useState('')

  const eventTitle = isRTL ? (event.title_ar || event.title) : event.title
  const teamName = team ? (isRTL ? (team.name_ar || team.name) : team.name) : ''
  const musterPoint = team ? (isRTL ? (team.muster_point_ar || team.muster_point) : team.muster_point) : null

  // Countdown to shift start
  useEffect(() => {
    if (!membership.shift_start) return

    const update = () => {
      const now = new Date()
      const start = new Date(membership.shift_start!)
      const diff = start.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilShift('')
        return
      }

      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)

      if (hours > 0) {
        setTimeUntilShift(`${hours}h ${minutes}m`)
      } else {
        setTimeUntilShift(`${minutes}m`)
      }
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [membership.shift_start])

  const handleCheckin = async () => {
    if (checkingIn) return
    const newStatus = checkinStatus === 'checked_in' ? 'not_arrived' : 'checked_in'
    setCheckingIn(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/self-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setCheckinStatus(newStatus)
      if (newStatus === 'checked_in') {
        toast.success(t('checkedInSuccess'))
      }
    } catch {
      toast.error('Failed to check in')
    } finally {
      setCheckingIn(false)
    }
  }

  const isCheckedIn = checkinStatus === 'checked_in'

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Event header */}
      <div className="text-center pt-4">
        <Badge variant="outline" className="mb-2">{t('mode')}</Badge>
        <h1 className="text-2xl font-bold">{eventTitle}</h1>
      </div>

      {/* My Assignment card */}
      <Card className={cn('border-2', isCheckedIn ? 'border-green-400' : 'border-zinc-200')}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{teamName || t('myAssignment')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Muster point */}
          {musterPoint && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{musterPoint}</span>
            </div>
          )}

          {/* Shift time */}
          {(membership.shift_start || membership.shift_end) && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span dir="ltr">
                {membership.shift_start
                  ? new Date(membership.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
                {membership.shift_end
                  ? ` – ${new Date(membership.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </span>
              {timeUntilShift && (
                <Badge variant="secondary" className="ms-1 text-xs">{timeUntilShift}</Badge>
              )}
            </div>
          )}

          {/* Role */}
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline">{t(membership.role as Parameters<typeof t>[0])}</Badge>
          </div>

          {/* Big check-in button */}
          <Button
            size="lg"
            className={cn(
              'w-full h-14 text-base font-semibold rounded-xl transition-colors',
              isCheckedIn
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-primary hover:bg-primary/90'
            )}
            onClick={handleCheckin}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <Loader2 className="h-5 w-5 animate-spin me-2" />
            ) : isCheckedIn ? (
              <CheckCircle2 className="h-5 w-5 me-2" />
            ) : null}
            {isCheckedIn ? t('checkedInSuccess') : t('selfCheckin')}
          </Button>
        </CardContent>
      </Card>

      {/* My tasks */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {t('myTasks')}
              <span className="ms-auto text-muted-foreground font-normal" dir="ltr">{tasks.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.due_at && (
                    <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                      {t('dueDate')}: {new Date(task.due_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {task.status === 'blocked' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge className={cn('text-xs', STATUS_COLORS[task.status] || '')}>
                    {t(task.status === 'open' ? 'taskOpen' : task.status === 'in_progress' ? 'taskInProgress' : task.status === 'blocked' ? 'taskBlocked' : 'taskDone')}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent broadcasts */}
      {broadcasts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              {t('recentBroadcastsLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {broadcasts.map((bc) => (
              <div
                key={bc.id}
                className={cn(
                  'rounded-xl border p-3 space-y-1',
                  bc.is_urgent && 'border-red-300 bg-red-50'
                )}
              >
                {bc.is_urgent && (
                  <Badge className="bg-red-100 text-red-700 text-xs mb-1">{t('urgentBroadcast')}</Badge>
                )}
                <p className="text-sm">{isRTL && bc.message_ar ? bc.message_ar : bc.message}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {new Date(bc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
