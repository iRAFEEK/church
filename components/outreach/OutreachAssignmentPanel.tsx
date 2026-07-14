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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { UserPlus, Loader2, Users, Phone, MapPin, Home, CheckCircle2 } from 'lucide-react'
import { analytics } from '@/lib/analytics'

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

// DB status values are snake_case ('in_progress') but the i18n keys are camelCase
// ('inProgress') — map explicitly so the badge never renders a raw DB value.
const STATUS_LABEL_KEY: Record<string, 'pending' | 'inProgress' | 'completed' | 'cancelled'> = {
  pending: 'pending',
  in_progress: 'inProgress',
  completed: 'completed',
  cancelled: 'cancelled',
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
                      {t(STATUS_LABEL_KEY[a.status] ?? 'pending')}
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

// ─────────────────────────────────────────────────────────────────────────────
// Member-facing "My Visits" list — used by app/(app)/outreach/page.tsx.
// Shows the assignments where the signed-in user is the assignee, with the
// purpose-bound contact info of the person to visit, and a "Log this visit"
// dialog that completes the assignment.
// ─────────────────────────────────────────────────────────────────────────────

interface MyVisitMember {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  phone: string | null
  address: string | null
  address_ar: string | null
  city: string | null
  city_ar: string | null
  address_notes: string | null
}

interface MyVisitAssignment {
  id: string
  member_id: string
  notes: string | null
  status: string
  created_at: string
  updated_at: string
  member: MyVisitMember | null
}

type MyVisitsListProps = {
  churchId: string
  role: string
}

export function MyVisitsList({ churchId, role }: MyVisitsListProps) {
  const t = useTranslations('outreach')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [active, setActive] = useState<MyVisitAssignment[]>([])
  const [completed, setCompleted] = useState<MyVisitAssignment[]>([])
  const [loading, setLoading] = useState(true)

  // Log-visit dialog state
  const [logTarget, setLogTarget] = useState<MyVisitAssignment | null>(null)
  const [visitDate, setVisitDate] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [needsFollowup, setNeedsFollowup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchMine = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/outreach/assignments/my', signal ? { signal } : undefined)
      if (res.ok && !signal?.aborted) {
        const json = await res.json()
        setActive(json.active ?? [])
        setCompleted(json.completed ?? [])
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        toast.error(t('error'))
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    fetchMine(controller.signal)
    return () => controller.abort()
  }, [fetchMine])

  const openLogDialog = (assignment: MyVisitAssignment) => {
    setLogTarget(assignment)
    setVisitDate(new Date().toISOString().split('T')[0])
    setVisitNotes('')
    setNeedsFollowup(false)
  }

  const handleLogVisit = async () => {
    if (isSubmitting || !logTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/outreach/assignments/${logTarget.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visit_date: visitDate,
          notes: visitNotes || null,
          needs_followup: needsFollowup,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      analytics.outreach.visitLogged({ church_id: churchId, role, locale, visit_type: 'assigned' })
      toast.success(t('saved'))
      setLogTarget(null)
      setLoading(true)
      fetchMine()
    } catch {
      toast.error(t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const memberName = (m: MyVisitMember | null) => getDisplayName(m, isAr)
  const memberAddress = (m: MyVisitMember | null) =>
    m ? (isAr ? (m.address_ar || m.address) : (m.address || m.address_ar)) : null
  const memberCity = (m: MyVisitMember | null) =>
    m ? (isAr ? (m.city_ar || m.city) : (m.city || m.city_ar)) : null

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MapPin className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t('myVisitsEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(a => (
            <Card key={a.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold min-w-0 truncate">{memberName(a.member)}</p>
                  <Badge variant={STATUS_VARIANT[a.status] || 'secondary'}>
                    {t(STATUS_LABEL_KEY[a.status] ?? 'pending')}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {(memberAddress(a.member) || memberCity(a.member)) && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Home className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        {[memberAddress(a.member), memberCity(a.member)].filter(Boolean).join(' — ')}
                      </span>
                    </div>
                  )}
                  {a.member?.address_notes && (
                    <p className="text-xs text-muted-foreground ms-6">{a.member.address_notes}</p>
                  )}
                  {a.member?.phone && (
                    <a
                      href={`tel:${a.member.phone}`}
                      className="inline-flex items-center gap-2 text-sm text-primary min-h-11"
                    >
                      <Phone className="h-4 w-4" />
                      <span dir="ltr">{a.member.phone}</span>
                    </a>
                  )}
                </div>

                {a.notes && (
                  <div className="rounded-md bg-muted p-2.5">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">{t('assignerNotes')}</p>
                    <p className="text-sm">{a.notes}</p>
                  </div>
                )}

                <Button className="h-11 w-full" onClick={() => openLogDialog(a)}>
                  <CheckCircle2 className="h-4 w-4 me-2" />
                  {t('logThisVisit')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('completedVisits')}</h2>
          <div className="space-y-2">
            {completed.map(a => (
              <div key={a.id} className="flex items-center gap-3 border rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm flex-1 min-w-0 truncate">{memberName(a.member)}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.updated_at).toLocaleDateString(locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log visit dialog */}
      <Dialog open={!!logTarget} onOpenChange={(open) => { if (!open) setLogTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('logNewVisit')}{logTarget ? ` — ${memberName(logTarget.member)}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="my-visit-date">{t('visitDate')}</Label>
              <Input
                id="my-visit-date"
                type="date"
                dir="ltr"
                className="h-11 text-base"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="my-visit-notes">{t('visitNotes')}</Label>
              <Textarea
                id="my-visit-notes"
                dir="auto"
                className="text-base"
                rows={3}
                value={visitNotes}
                onChange={e => setVisitNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between min-h-11">
              <Label htmlFor="my-visit-followup">{t('followupNeeded')}</Label>
              <Switch
                id="my-visit-followup"
                checked={needsFollowup}
                onCheckedChange={setNeedsFollowup}
              />
            </div>
          </div>

          <DialogFooter>
            <Button className="h-11 w-full" onClick={handleLogVisit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin me-2" /> : null}
              {t('logVisit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
