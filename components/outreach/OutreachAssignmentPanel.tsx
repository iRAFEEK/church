'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2, Users } from 'lucide-react'

interface ProfileInfo {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

interface Assignment {
  id: string
  member_id: string
  assigned_to: string
  assigned_by: string
  notes: string | null
  status: string
  created_at: string
  updated_at: string
  member: ProfileInfo | null
  assignee: ProfileInfo | null
  assigner: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null } | null
}

interface MemberOption {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

type OutreachAssignmentPanelProps = {
  memberId: string
  currentUserId: string
  canManage: boolean
}

function getDisplayName(
  profile: { first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null } | null,
  isAr: boolean
): string {
  if (!profile) return '?'
  if (isAr && profile.first_name_ar) {
    return `${profile.first_name_ar} ${profile.last_name_ar || ''}`.trim()
  }
  return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '?'
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  completed: 'outline',
  cancelled: 'destructive',
}

export function OutreachAssignmentPanel({ memberId, currentUserId, canManage }: OutreachAssignmentPanelProps) {
  const t = useTranslations('outreach')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Form state
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchAssignments = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/outreach/assignments?member_id=${memberId}`, signal ? { signal } : undefined)
      if (res.ok && !signal?.aborted) {
        const json = await res.json()
        setAssignments(json.data ?? [])
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        toast.error(t('error'))
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [memberId, t])

  const fetchMembers = useCallback(async (signal?: AbortSignal) => {
    setMembersLoading(true)
    try {
      const res = await fetch('/api/profiles?status=active&pageSize=100', signal ? { signal } : undefined)
      if (res.ok && !signal?.aborted) {
        const json = await res.json()
        setMembers(json.profiles ?? [])
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        // silent — non-critical
      }
    } finally {
      if (!signal?.aborted) setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAssignments(controller.signal)
    if (canManage) {
      fetchMembers(controller.signal)
    }
    return () => controller.abort()
  }, [fetchAssignments, fetchMembers, canManage])

  const handleAssign = async () => {
    if (isSubmitting || !selectedAssignee) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/outreach/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          assigned_to: selectedAssignee,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        throw new Error('Failed')
      }
      toast.success(t('assignmentCreated'))
      setSelectedAssignee('')
      setNotes('')
      fetchAssignments()
    } catch {
      toast.error(t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssignToMyself = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/outreach/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          assigned_to: currentUserId,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('assignmentCreated'))
      setNotes('')
      fetchAssignments()
    } catch {
      toast.error(t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (assignmentId: string, newStatus: string) => {
    if (updatingId) return
    setUpdatingId(assignmentId)
    try {
      const res = await fetch(`/api/outreach/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('assignmentUpdated'))
      fetchAssignments()
    } catch {
      toast.error(t('error'))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (updatingId) return
    setUpdatingId(assignmentId)
    try {
      const res = await fetch(`/api/outreach/assignments/${assignmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('assignmentUpdated'))
      fetchAssignments()
    } catch {
      toast.error(t('error'))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="size-4" />
          {t('assignments')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Assignment form — only shown to managers */}
        {canManage && (
          <div className="space-y-3 border rounded-lg p-3">
            <Label>{t('assignOutreach')}</Label>

            <div className="space-y-2">
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="h-11 w-full text-base">
                  <SelectValue placeholder={t('assignedTo')} />
                </SelectTrigger>
                <SelectContent>
                  {membersLoading ? (
                    <div className="p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    members.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {getDisplayName(m, isAr)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-notes">{t('assignmentNotes')}</Label>
              <Textarea
                id="assignment-notes"
                dir="auto"
                className="text-base"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder={t('assignmentNotes')}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleAssign}
                disabled={isSubmitting || !selectedAssignee}
                className="h-11 flex-1"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin me-2" /> : null}
                {t('assign')}
              </Button>
              <Button
                variant="outline"
                onClick={handleAssignToMyself}
                disabled={isSubmitting}
                className="h-11 flex-1"
              >
                {t('assignToMyself')}
              </Button>
            </div>
          </div>
        )}

        {/* Assignment list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t('noAssignments')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => {
              const isMyAssignment = a.assigned_to === currentUserId
              const canUpdate = isMyAssignment || canManage

              return (
                <div key={a.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={a.assignee?.photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getDisplayName(a.assignee, isAr).slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t('assignedTo')}: {getDisplayName(a.assignee, isAr)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('assignedBy')}: {getDisplayName(a.assigner, isAr)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[a.status] || 'secondary'}>
                      {t(a.status as 'pending' | 'inProgress' | 'completed' | 'cancelled')}
                    </Badge>
                  </div>

                  {a.notes && (
                    <p className="text-sm text-muted-foreground ps-12">{a.notes}</p>
                  )}

                  <div className="flex items-center justify-between ps-12">
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString(locale)}
                    </span>

                    {canUpdate && a.status !== 'completed' && a.status !== 'cancelled' && (
                      <div className="flex gap-1">
                        {a.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-xs"
                            disabled={updatingId === a.id}
                            onClick={() => handleStatusUpdate(a.id, 'in_progress')}
                          >
                            {updatingId === a.id ? <Loader2 className="size-3 animate-spin" /> : t('inProgress')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-xs"
                          disabled={updatingId === a.id}
                          onClick={() => handleStatusUpdate(a.id, 'completed')}
                        >
                          {t('completed')}
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-xs text-destructive hover:text-destructive"
                            disabled={updatingId === a.id}
                            onClick={() => handleDelete(a.id)}
                          >
                            {t('cancelled')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
