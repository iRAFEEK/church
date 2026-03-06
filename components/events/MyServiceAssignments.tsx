'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Users, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ServiceAssignment {
  id: string
  service_need_id: string
  status: 'assigned' | 'confirmed' | 'declined'
  event: { id: string; title: string; title_ar: string | null; starts_at: string; location: string | null }
  ministry?: { name: string; name_ar: string | null }
  group?: { name: string; name_ar: string | null }
  volunteers_needed: number
}

export function MyServiceAssignments() {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [assignments, setAssignments] = useState<ServiceAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = async () => {
    try {
      // Use the leader service needs endpoint — it includes assignments
      // For members, we need a different approach - fetch own assignments
      const res = await fetch('/api/my-service-assignments')
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.data || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAssignments() }, [])

  const updateStatus = async (assignment: ServiceAssignment, newStatus: 'confirmed' | 'declined') => {
    const res = await fetch(
      `/api/events/${assignment.event.id}/service-needs/${assignment.service_need_id}/assignments/${assignment.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }
    )

    if (res.ok) {
      toast.success(t('assignmentUpdated'))
      fetchAssignments()
    } else {
      toast.error(t('errorGeneral'))
    }
  }

  if (loading) return null
  if (assignments.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('myAssignments')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assignments.map(assignment => {
            const eventTitle = isRTL ? (assignment.event.title_ar || assignment.event.title) : assignment.event.title
            const teamName = isRTL
              ? (assignment.ministry?.name_ar || assignment.ministry?.name || assignment.group?.name_ar || assignment.group?.name)
              : (assignment.ministry?.name || assignment.group?.name)
            const date = new Date(assignment.event.starts_at)

            const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
              assigned: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3.5 w-3.5" />, label: t('assignedStatus') },
              confirmed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: t('youConfirmed') },
              declined: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3.5 w-3.5" />, label: t('youDeclined') },
            }

            const config = statusConfig[assignment.status]

            return (
              <div key={assignment.id} className="p-3 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/events/${assignment.event.id}`} className="text-sm font-medium text-zinc-800 hover:underline">
                      {eventTitle}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {teamName} &middot;{' '}
                      {date.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn('text-xs flex items-center gap-1 shrink-0', config.color)}>
                    {config.icon}
                    {config.label}
                  </Badge>
                </div>

                {assignment.status === 'assigned' && (
                  <div className="flex gap-2 ms-12">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => updateStatus(assignment, 'confirmed')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                      {t('confirmServing')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => updateStatus(assignment, 'declined')}
                    >
                      <XCircle className="h-3.5 w-3.5 me-1" />
                      {t('declineServing')}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
