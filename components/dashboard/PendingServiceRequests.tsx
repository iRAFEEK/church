'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Calendar, Check, X, UserPlus, ClipboardList } from 'lucide-react'

interface ServiceRequestItem {
  id: string
  event_id: string
  requested_role: string
  status: string
  notes: string | null
  created_at: string
  requested_by_profile: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
  event: {
    id: string
    title: string
    title_ar: string | null
    starts_at: string
    location: string | null
    status: string
  } | null
}

interface MemberOption {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
}

export function PendingServiceRequests() {
  const t = useTranslations('serviceRequests')
  const locale = useLocale()
  const router = useRouter()
  const isAr = locale.startsWith('ar')

  const [requests, setRequests] = useState<ServiceRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reassign dialog
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [reassignRequestId, setReassignRequestId] = useState<string | null>(null)
  const [reassignEventId, setReassignEventId] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [reassignNote, setReassignNote] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/service-requests/mine', { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!controller.signal.aborted) setRequests(d.data || []) })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          // Silent fail — dashboard widget should not block the page
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const handleRespond = useCallback(async (requestId: string, eventId: string, status: 'accepted' | 'declined') => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setRespondingId(requestId)
    try {
      const res = await fetch(`/api/events/${eventId}/service-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(status === 'accepted' ? t('requestAccepted') : t('requestDeclined'))
      setRequests(prev => prev.filter(r => r.id !== requestId))
      router.refresh()
    } catch {
      toast.error(t('errorResponding'))
    } finally {
      setIsSubmitting(false)
      setRespondingId(null)
    }
  }, [isSubmitting, t, router])

  const openReassignDialog = useCallback(async (requestId: string, eventId: string) => {
    setReassignRequestId(requestId)
    setReassignEventId(eventId)
    setReassignDialogOpen(true)
    setMembersLoading(true)
    setSelectedMemberId(null)
    setReassignNote('')
    setMemberSearch('')

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

  const handleReassign = useCallback(async () => {
    if (isSubmitting || !reassignRequestId || !reassignEventId || !selectedMemberId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${reassignEventId}/service-requests/${reassignRequestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'reassigned',
          reassign_to: selectedMemberId,
          response_note: reassignNote || null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('requestReassigned'))
      setRequests(prev => prev.filter(r => r.id !== reassignRequestId))
      setReassignDialogOpen(false)
      router.refresh()
    } catch {
      toast.error(t('errorResponding'))
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, reassignRequestId, reassignEventId, selectedMemberId, reassignNote, t, router])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) return null

  const filteredMembers = members.filter(m => {
    if (!memberSearch) return true
    const name = `${m.first_name ?? ''} ${m.last_name ?? ''} ${m.first_name_ar ?? ''} ${m.last_name_ar ?? ''}`.toLowerCase()
    return name.includes(memberSearch.toLowerCase())
  })

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {t('pendingRequests')}
            <Badge variant="secondary" className="ms-auto">{requests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map(request => {
            const event = request.event
            if (!event) return null

            const eventTitle = isAr ? (event.title_ar || event.title) : event.title
            const requester = request.requested_by_profile
            const requesterName = requester
              ? isAr
                ? `${requester.first_name_ar ?? requester.first_name ?? ''} ${requester.last_name_ar ?? requester.last_name ?? ''}`.trim()
                : `${requester.first_name ?? ''} ${requester.last_name ?? ''}`.trim()
              : t('unknown')
            const eventDate = new Date(event.starts_at).toLocaleDateString(
              isAr ? 'ar-EG' : 'en-US',
              { month: 'short', day: 'numeric' }
            )
            const isResponding = respondingId === request.id

            return (
              <div key={request.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{eventTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {eventDate}
                      </span>
                      <Badge variant="outline" className="text-xs">{request.requested_role}</Badge>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('requestedBy')}: {requesterName}
                </p>

                {request.notes && (
                  <p className="text-xs text-muted-foreground italic">{request.notes}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className="h-11 gap-1.5"
                    disabled={isResponding || isSubmitting}
                    onClick={() => handleRespond(request.id, request.event_id, 'accepted')}
                  >
                    <Check className="h-4 w-4" />
                    {t('accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 gap-1.5"
                    disabled={isResponding || isSubmitting}
                    onClick={() => openReassignDialog(request.id, request.event_id)}
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('assignSomeone')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 gap-1.5 text-destructive hover:text-destructive"
                    disabled={isResponding || isSubmitting}
                    onClick={() => handleRespond(request.id, request.event_id, 'declined')}
                  >
                    <X className="h-4 w-4" />
                    {t('decline')}
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('assignSomeone')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('searchMember')}</Label>
              <Input
                dir="auto"
                className="text-base mt-1"
                placeholder={t('searchMemberPlaceholder')}
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-md">
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
                  const name = isAr
                    ? `${member.first_name_ar ?? member.first_name ?? ''} ${member.last_name_ar ?? member.last_name ?? ''}`.trim()
                    : `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
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

            <div>
              <Label>{t('responseNote')}</Label>
              <Textarea
                dir="auto"
                className="text-base mt-1"
                placeholder={t('responseNotePlaceholder')}
                value={reassignNote}
                onChange={e => setReassignNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setReassignDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              className="h-11"
              disabled={!selectedMemberId || isSubmitting}
              onClick={handleReassign}
            >
              {isSubmitting ? t('saving') : t('confirmAssign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
