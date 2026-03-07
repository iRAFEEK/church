'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Users, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Search, Pencil, ChevronDown, ChevronUp
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { normalizeSearch, useDebounce } from '@/lib/utils/search'
import { getAvatarUrl } from '@/lib/utils/storage'
import type { RolePreset } from '@/types'

interface ServiceNeed {
  id: string
  ministry_id: string | null
  group_id: string | null
  volunteers_needed: number
  notes: string | null
  notes_ar: string | null
  role_presets: RolePreset[] | null
  ministry?: { id: string; name: string; name_ar: string | null; leader_id: string | null }
  group?: { id: string; name: string; name_ar: string | null; leader_id: string | null; co_leader_id: string | null }
  assignments: Assignment[]
  assigned_count: number
}

interface Assignment {
  id: string
  profile_id: string
  status: 'assigned' | 'confirmed' | 'declined'
  notes: string | null
  role: string | null
  role_ar: string | null
  created_at: string
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
    phone: string | null
  }
}

interface MemberOption {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

interface InlineStaffingManagerProps {
  eventId: string
}

export function InlineStaffingManager({ eventId }: InlineStaffingManagerProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [needs, setNeeds] = useState<ServiceNeed[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNeed, setExpandedNeed] = useState<string | null>(null)

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [activeNeed, setActiveNeed] = useState<ServiceNeed | null>(null)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)
  const [assignRole, setAssignRole] = useState('')
  const [assignRoleAr, setAssignRoleAr] = useState('')
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([])

  // Edit role dialog state
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<{ needId: string; assignment: Assignment } | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editRoleAr, setEditRoleAr] = useState('')

  const debouncedSearch = useDebounce(memberSearch, 300)

  const fetchNeeds = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/service-needs`)
    const data = await res.json()
    setNeeds(data.data || [])
    setLoading(false)
  }, [eventId])

  useEffect(() => { fetchNeeds() }, [fetchNeeds])

  useEffect(() => {
    fetch('/api/role-suggestions')
      .then(r => r.json())
      .then(d => setRoleSuggestions(d.data || []))
      .catch(() => {})
  }, [])

  const getDisplayName = useCallback((p: { first_name?: string | null; last_name?: string | null; first_name_ar?: string | null; last_name_ar?: string | null }) => {
    if (isRTL) {
      return `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
    }
    return `${p.first_name || ''} ${p.last_name || ''}`.trim()
  }, [isRTL])

  const getRoleName = useCallback((a: { role?: string | null; role_ar?: string | null }) => {
    if (isRTL) return a.role_ar || a.role || null
    return a.role || null
  }, [isRTL])

  const statusConfig = useMemo(() => ({
    assigned: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3.5 w-3.5" /> },
    confirmed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    declined: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3.5 w-3.5" /> },
  } as Record<string, { color: string; icon: React.ReactNode }>), [])

  const openAssignDialog = async (need: ServiceNeed) => {
    setActiveNeed(need)
    setMemberSearch('')
    setSelectedMember(null)
    setAssignRole('')
    setAssignRoleAr('')
    setAssignDialogOpen(true)
    setLoadingMembers(true)

    const teamType = need.ministry_id ? 'ministry' : 'group'
    const teamId = need.ministry_id || need.group_id

    try {
      if (teamType === 'group') {
        const res = await fetch(`/api/groups/${teamId}/members`)
        const data = await res.json()
        setMembers(
          (data.data || [])
            .filter((m: any) => m.is_active)
            .map((m: any) => m.profile || m)
        )
      } else {
        const groupsRes = await fetch(`/api/groups?ministry_id=${teamId}`)
        const groupsData = await groupsRes.json()
        const groups = groupsData.data || []
        const memberResults = await Promise.all(
          groups.map((group: { id: string }) =>
            fetch(`/api/groups/${group.id}/members`).then(r => r.json())
          )
        )
        const allMembers: MemberOption[] = []
        const seen = new Set<string>()
        for (const membersData of memberResults) {
          for (const m of membersData.data || []) {
            if (m.is_active && m.profile && !seen.has(m.profile.id)) {
              seen.add(m.profile.id)
              allMembers.push(m.profile)
            }
          }
        }
        setMembers(allMembers)
      }
    } catch {
      setMembers([])
    }
    setLoadingMembers(false)
  }

  const confirmAssignment = async () => {
    if (!activeNeed || !selectedMember) return
    const res = await fetch(`/api/events/${eventId}/service-needs/${activeNeed.id}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: selectedMember.id,
        role: assignRole || null,
        role_ar: assignRoleAr || null,
      }),
    })
    if (res.ok) {
      toast.success(t('assignmentCreated'))
      setAssignDialogOpen(false)
      setSelectedMember(null)
      fetchNeeds()
    } else {
      const data = await res.json()
      toast.error(data.error || t('errorGeneral'))
    }
  }

  const removeAssignment = async (needId: string, assignmentId: string) => {
    const res = await fetch(`/api/events/${eventId}/service-needs/${needId}/assignments`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_id: assignmentId }),
    })
    if (res.ok) {
      toast.success(t('assignmentRemoved'))
      fetchNeeds()
    } else {
      toast.error(t('errorGeneral'))
    }
  }

  const openEditRoleDialog = (needId: string, assignment: Assignment) => {
    setEditingAssignment({ needId, assignment })
    setEditRole(assignment.role || '')
    setEditRoleAr(assignment.role_ar || '')
    setEditRoleDialogOpen(true)
  }

  const saveRoleEdit = async () => {
    if (!editingAssignment) return
    const { needId, assignment } = editingAssignment
    const res = await fetch(
      `/api/events/${eventId}/service-needs/${needId}/assignments/${assignment.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, role_ar: editRoleAr }),
      }
    )
    if (res.ok) {
      toast.success(t('roleUpdated'))
      setEditRoleDialogOpen(false)
      fetchNeeds()
    } else {
      toast.error(t('errorGeneral'))
    }
  }

  const filteredMembers = useMemo(() => {
    if (!debouncedSearch) return members
    const q = normalizeSearch(debouncedSearch)
    return members.filter(m => {
      const name = normalizeSearch(getDisplayName(m))
      return name.includes(q)
    })
  }, [members, debouncedSearch, getDisplayName])

  if (loading) return <div className="text-sm text-zinc-400 py-4">{t('loading')}</div>
  if (needs.length === 0) return null

  return (
    <div className="space-y-3">
      {needs.map(need => {
        const name = isRTL
          ? (need.ministry?.name_ar || need.ministry?.name || need.group?.name_ar || need.group?.name)
          : (need.ministry?.name || need.group?.name)
        const assignedCount = need.assigned_count
        const needed = need.volunteers_needed
        const confirmedCount = (need.assignments || []).filter(a => a.status === 'confirmed').length
        const declinedCount = (need.assignments || []).filter(a => a.status === 'declined').length
        const pendingCount = (need.assignments || []).filter(a => a.status === 'assigned').length
        const ratio = Math.min(assignedCount / needed, 1)
        const isExpanded = expandedNeed === need.id

        let statusColor = 'bg-red-100 text-red-700'
        let statusText = t('needsStaffing')
        if (assignedCount >= needed) {
          statusColor = 'bg-green-100 text-green-700'
          statusText = t('fullyStaffed')
        } else if (assignedCount > 0) {
          statusColor = 'bg-yellow-100 text-yellow-700'
          statusText = t('partiallyStaffed')
        }

        return (
          <div key={need.id} className="border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedNeed(isExpanded ? null : need.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors text-start"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
                  <Badge variant="outline" className={cn('text-xs', statusColor)}>
                    {statusText}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t('fulfillment', { assigned: String(assignedCount), needed: String(needed) })}
                </p>
                <div className="mt-2 h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      ratio >= 1 ? 'bg-green-500' : ratio > 0 ? 'bg-yellow-500' : 'bg-zinc-200'
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-zinc-400">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3">
                {/* Status breakdown */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {confirmedCount} {t('confirmedStatus')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-yellow-500" />
                      {pendingCount} {t('assignedStatus')}
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      {declinedCount} {t('declinedStatus')}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAssignDialog(need)}
                    disabled={assignedCount >= needed}
                  >
                    <Plus className="h-4 w-4 me-1" />
                    {t('assignMember')}
                  </Button>
                </div>

                {/* Notes */}
                {(need.notes || need.notes_ar) && (
                  <p className="text-xs text-zinc-400 italic">
                    {isRTL ? (need.notes_ar || need.notes) : (need.notes || need.notes_ar)}
                  </p>
                )}

                {/* Assignments list */}
                {need.assignments && need.assignments.length > 0 && (
                  <div className="space-y-2">
                    {need.assignments.map(assignment => {
                      const pName = getDisplayName(assignment.profile)
                      const roleName = getRoleName(assignment)
                      const config = statusConfig[assignment.status]

                      return (
                        <div key={assignment.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                          {assignment.profile.photo_url ? (
                            <Image src={getAvatarUrl(assignment.profile.photo_url, 32)!} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-500">
                              {(assignment.profile.first_name || '?')[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-700 truncate">{pName}</p>
                            {roleName ? (
                              <p className="text-xs text-zinc-500">{roleName}</p>
                            ) : assignment.profile.phone ? (
                              <p className="text-xs text-zinc-400" dir="ltr">{assignment.profile.phone}</p>
                            ) : null}
                          </div>
                          <Badge variant="outline" className={cn('text-xs flex items-center gap-1', config.color)}>
                            {config.icon}
                            {t(`${assignment.status}Status`)}
                          </Badge>
                          <button
                            onClick={() => openEditRoleDialog(need.id, assignment)}
                            className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
                            title={t('editRole')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeAssignment(need.id, assignment.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Assign Member Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => {
        setAssignDialogOpen(open)
        if (!open) setSelectedMember(null)
      }}>
        <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
          <DialogHeader>
            <DialogTitle>{t('assignMember')}</DialogTitle>
          </DialogHeader>

          {!selectedMember ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={t('searchMembers')}
                  className="ps-9"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {loadingMembers ? (
                  <div className="text-center py-6 text-zinc-400 text-sm">{t('loading')}</div>
                ) : (
                  filteredMembers.map(member => {
                    const isAssigned = activeNeed?.assignments?.some(a => a.profile_id === member.id)
                    const name = getDisplayName(member)

                    return (
                      <button
                        key={member.id}
                        type="button"
                        disabled={isAssigned}
                        onClick={() => setSelectedMember(member)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-start transition-colors',
                          isAssigned
                            ? 'bg-zinc-50 opacity-50 cursor-not-allowed'
                            : 'hover:bg-zinc-50'
                        )}
                      >
                        {member.photo_url ? (
                          <Image src={getAvatarUrl(member.photo_url, 32)!} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-500">
                            {(member.first_name || '?')[0]}
                          </div>
                        )}
                        <span className="text-sm text-zinc-700 flex-1">{name}</span>
                        {isAssigned && (
                          <span className="text-xs text-zinc-400">{t('alreadyAssigned')}</span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                {selectedMember.photo_url ? (
                  <Image src={getAvatarUrl(selectedMember.photo_url, 40)!} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-500">
                    {(selectedMember.first_name || '?')[0]}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-800">{getDisplayName(selectedMember)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                  {t('changeSelection')}
                </Button>
              </div>

              {/* Role preset quick-select chips */}
              {activeNeed?.role_presets && activeNeed.role_presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeNeed.role_presets.map((preset, i) => {
                    const filledCount = activeNeed.assignments.filter(
                      a => a.role === preset.role && a.status !== 'declined'
                    ).length
                    const remaining = preset.count - filledCount
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAssignRole(preset.role)
                          setAssignRoleAr(preset.role_ar)
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs border transition-colors',
                          assignRole === preset.role
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        )}
                      >
                        {isRTL ? (preset.role_ar || preset.role) : preset.role}
                        {remaining > 0 && (
                          <span className="ms-1 text-zinc-400">({remaining})</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <div>
                <Label className="text-sm text-zinc-500 mb-1 block">{t('roleLabel')}</Label>
                <Input
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  placeholder={t('rolePlaceholder')}
                  dir="ltr"
                  list="role-suggestions"
                />
                <datalist id="role-suggestions">
                  {roleSuggestions.map(r => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label className="text-sm text-zinc-500 mb-1 block">{t('roleAr')}</Label>
                <Input
                  value={assignRoleAr}
                  onChange={(e) => setAssignRoleAr(e.target.value)}
                  dir="rtl"
                />
              </div>

              <DialogFooter>
                <Button onClick={confirmAssignment} className="w-full">
                  {t('confirmAssignmentBtn')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent className={cn('sm:max-w-sm', isRTL && 'rtl')}>
          <DialogHeader>
            <DialogTitle>{t('editRole')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('roleLabel')}</Label>
              <Input
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                placeholder={t('rolePlaceholder')}
                dir="ltr"
                list="role-suggestions-edit"
              />
              <datalist id="role-suggestions-edit">
                {roleSuggestions.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('roleAr')}</Label>
              <Input
                value={editRoleAr}
                onChange={(e) => setEditRoleAr(e.target.value)}
                dir="rtl"
              />
            </div>
            <DialogFooter>
              <Button onClick={saveRoleEdit} className="w-full">
                {t('saveRole')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
