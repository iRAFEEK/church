'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Check, X, Clock, UserCheck, UserX, ArrowRightLeft, ClipboardList } from 'lucide-react'

interface ServiceRequest {
  id: string
  event_id: string
  requested_role: string
  status: string
  notes: string | null
  response_note: string | null
  created_at: string
  updated_at: string
  requested_by_profile: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
  assigned_to_profile: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
}

interface MemberOption {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
}

type EventServiceRequestsProps = {
  eventId: string
}

export function EventServiceRequests({ eventId }: EventServiceRequestsProps) {
  const t = useTranslations('serviceRequests')
  const locale = useLocale()
  const router = useRouter()
  const isAr = locale.startsWith('ar')

  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [requestedRole, setRequestedRole] = useState('')
  const [requestNotes, setRequestNotes] = useState('')

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/service-requests`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRequests(data.data || [])
    } catch {
      // Silent fail on fetch
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/events/${eventId}/service-requests`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setRequests(d.data || []) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          // Silent
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [eventId])

  const openCreateDialog = useCallback(async () => {
    setCreateDialogOpen(true)
    setSelectedMemberId(null)
    setRequestedRole('')
    setRequestNotes('')
    setMemberSearch('')
    setMembersLoading(true)

    try {
      const res = await fetch('/api/profiles?status=active&limit=100')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMembers(data.data || data.profiles || [])
    } catch {
      toast.error(t('errorLoadingMembers'))
    } finally {
      setMembersLoading(false)
    }
  }, [t])

  const handleCreate = useCallback(async () => {
    if (isSubmitting || !selectedMemberId || !requestedRole.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${eventId}/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: selectedMemberId,
          requested_role: requestedRole.trim(),
          notes: requestNotes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('serviceRequestCreated'))
      setCreateDialogOpen(false)
      await fetchRequests()
      router.refresh()
    } catch {
      toast.error(t('errorCreating'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, selectedMemberId, requestedRole, requestNotes, eventId, t, fetchRequests, router])

  const getName = (profile: { first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null } | null) => {
    if (!profile) return t('unknown')
    if (isAr) {
      return `${profile.first_name_ar ?? profile.first_name ?? ''} ${profile.last_name_ar ?? profile.last_name ?? ''}`.trim()
    }
    return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  }

  const statusConfig: Record<string, { icon: typeof Check; color: string; label: string }> = {
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: t('statusPending') },
    accepted: { icon: UserCheck, color: 'bg-green-100 text-green-800', label: t('statusAccepted') },
    declined: { icon: UserX, color: 'bg-red-100 text-red-800', label: t('statusDeclined') },
    reassigned: { icon: ArrowRightLeft, color: 'bg-blue-100 text-blue-800', label: t('statusReassigned') },
  }

  const filteredMembers = members.filter(m => {
    if (!memberSearch) return true
    const name = `${m.first_name ?? ''} ${m.last_name ?? ''} ${m.first_name_ar ?? ''} ${m.last_name_ar ?? ''}`.toLowerCase()
    return name.includes(memberSearch.toLowerCase())
  })

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {t('serviceRequestCount', { count: requests.length })}
          </span>
        </div>
        <Button size="sm" variant="outline" className="h-11 gap-1.5" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {t('createRequest')}
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <ClipboardList className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">{t('noRequests')}</p>
          <Button size="sm" variant="outline" className="h-11" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 me-1" />
            {t('createRequest')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(request => {
            const config = statusConfig[request.status] ?? statusConfig.pending
            const StatusIcon = config.icon

            return (
              <Card key={request.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{request.requested_role}</Badge>
                        <Badge variant="outline" className={`text-xs ${config.color}`}>
                          <StatusIcon className="h-3 w-3 me-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {t('assignedTo')}: {getName(request.assigned_to_profile)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('requestedBy')}: {getName(request.requested_by_profile)}
                      </p>
                      {request.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{request.notes}</p>
                      )}
                      {request.response_note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('responseNote')}: {request.response_note}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Service Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createRequest')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('requestedRole')}</Label>
              <Input
                dir="auto"
                className="text-base mt-1"
                placeholder={t('requestedRolePlaceholder')}
                value={requestedRole}
                onChange={e => setRequestedRole(e.target.value)}
              />
            </div>

            <div>
              <Label>{t('assignTo')}</Label>
              <Input
                dir="auto"
                className="text-base mt-1"
                placeholder={t('searchMemberPlaceholder')}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto border rounded-md mt-1">
                {membersLoading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('noMembersFound')}</p>
                ) : (
                  filteredMembers.slice(0, 20).map(member => {
                    const name = getName(member)
                    const isSelected = selectedMemberId === member.id
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`w-full text-start px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors h-11 ${
                          isSelected ? 'bg-primary/10 font-medium' : ''
                        }`}
                        onClick={() => setSelectedMemberId(member.id)}
                      >
                        {name}
                        {isSelected && <Check className="inline h-4 w-4 ms-2 text-primary" />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div>
              <Label>{t('notes')}</Label>
              <Textarea
                dir="auto"
                className="text-base mt-1"
                placeholder={t('notesPlaceholder')}
                value={requestNotes}
                onChange={e => setRequestNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setCreateDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              className="h-11"
              disabled={!selectedMemberId || !requestedRole.trim() || isSubmitting}
              onClick={handleCreate}
            >
              {isSubmitting ? t('saving') : t('sendRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
