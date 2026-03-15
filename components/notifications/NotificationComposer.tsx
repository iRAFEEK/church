'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Send, Users, Shield, Building2, Heart, X, Info, Loader2,
  UserPlus, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AudienceTarget {
  type: 'all_church' | 'roles' | 'groups' | 'ministries' | 'statuses' | 'visitors' | 'gender'
  roles?: string[]
  groupIds?: string[]
  ministryIds?: string[]
  statuses?: string[]
  visitorStatuses?: string[]
  gender?: string
}

interface GroupOption { id: string; name: string; name_ar: string | null }
interface MinistryOption { id: string; name: string; name_ar: string | null }

const ROLES = ['member', 'group_leader', 'ministry_leader', 'super_admin'] as const
const STATUSES = ['active', 'at_risk', 'inactive'] as const
const VISITOR_STATUSES = ['new', 'assigned', 'contacted'] as const
const GENDERS = ['male', 'female'] as const

interface NotificationComposerProps {
  allowedTargetTypes: string[]
  isUnscoped: boolean
  userRole: string | null
  initialGroups: GroupOption[]
  initialMinistries: MinistryOption[]
  onClose: () => void
  open: boolean
}

export function NotificationComposer({
  allowedTargetTypes, isUnscoped, userRole,
  initialGroups, initialMinistries, onClose, open,
}: NotificationComposerProps) {
  const tc = useTranslations('notificationComposer')

  const [allChurch, setAllChurch] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedVisitorStatuses, setSelectedVisitorStatuses] = useState<string[]>([])
  const [selectedGender, setSelectedGender] = useState<string>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [groups, setGroups] = useState<GroupOption[]>(initialGroups)
  const [ministries, setMinistries] = useState<MinistryOption[]>(initialMinistries)
  const [audienceCount, setAudienceCount] = useState<{ profileCount: number; visitorCount: number; total: number } | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // For super_admin: load all groups/ministries
  useEffect(() => {
    if (!isUnscoped) return
    const controller = new AbortController()
    async function loadOptions() {
      try {
        const [groupsRes, ministriesRes] = await Promise.all([
          fetch('/api/groups', { signal: controller.signal }),
          fetch('/api/ministries', { signal: controller.signal }),
        ])
        if (controller.signal.aborted) return
        if (groupsRes.ok) {
          const json = await groupsRes.json()
          setGroups((json.data || json) as GroupOption[])
        }
        if (ministriesRes.ok) {
          const json = await ministriesRes.json()
          setMinistries((json.data || json) as MinistryOption[])
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[NotificationComposer] Failed to fetch options:', e)
        }
      }
    }
    loadOptions()
    return () => controller.abort()
  }, [isUnscoped])

  const buildTargets = useCallback((): AudienceTarget[] => {
    const targets: AudienceTarget[] = []
    if (allChurch) { targets.push({ type: 'all_church' }); return targets }
    if (selectedRoles.length) targets.push({ type: 'roles', roles: selectedRoles })
    if (selectedGroups.length) targets.push({ type: 'groups', groupIds: selectedGroups })
    if (selectedMinistries.length) targets.push({ type: 'ministries', ministryIds: selectedMinistries })
    if (selectedStatuses.length) targets.push({ type: 'statuses', statuses: selectedStatuses })
    if (selectedVisitorStatuses.length) targets.push({ type: 'visitors', visitorStatuses: selectedVisitorStatuses })
    if (selectedGender) targets.push({ type: 'gender', gender: selectedGender })
    return targets
  }, [allChurch, selectedRoles, selectedGroups, selectedMinistries, selectedStatuses, selectedVisitorStatuses, selectedGender])

  // Audience count preview (debounced)
  useEffect(() => {
    const targets = buildTargets()
    if (!targets.length) { setAudienceCount(null); return }
    setLoadingCount(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/notifications/audience', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets }),
          signal: controller.signal,
        })
        if (res.ok && !controller.signal.aborted) setAudienceCount(await res.json())
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') { /* ignore */ }
      } finally {
        if (!controller.signal.aborted) setLoadingCount(false)
      }
    }, 500)
    return () => { clearTimeout(timer); controller.abort() }
  }, [buildTargets])

  const toggleInArray = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value])
  }

  const handleSend = async () => {
    setShowConfirm(false)
    setSending(true)
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleAr: title, titleEn: title,
          bodyAr: body, bodyEn: body,
          targets: buildTargets(),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(tc('sendFailed'), { description: json.error })
        return
      }
      const json = await res.json()
      toast.success(tc('sendSuccess'), { description: tc('sentCount', { count: json.sent }) })
      onClose()
    } catch {
      toast.error(tc('sendFailed'))
    } finally {
      setSending(false)
    }
  }

  const hasTargets = buildTargets().length > 0
  const canSubmit = hasTargets && title.trim() && body.trim() && !sending

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                {tc('sheetTitle')}
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Audience Section */}
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                {tc('audienceTitle')}
              </label>

              {!isUnscoped && (
                <div className="rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  {userRole === 'ministry_leader' ? tc('scopeInfo_ministry_leader') : tc('scopeInfo_group_leader')}
                </div>
              )}

              {allowedTargetTypes.includes('all_church') && (
                <button
                  onClick={() => {
                    setAllChurch(!allChurch)
                    if (!allChurch) {
                      setSelectedRoles([]); setSelectedGroups([]); setSelectedMinistries([])
                      setSelectedStatuses([]); setSelectedVisitorStatuses([]); setSelectedGender('')
                    }
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-start transition-colors min-h-[44px] ${
                    allChurch ? 'border-primary bg-primary/5 text-primary' : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-sm">{tc('allChurch')}</span>
                  </div>
                </button>
              )}

              {!allChurch && (
                <div className="space-y-3">
                  {allowedTargetTypes.includes('roles') && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Shield className="h-3 w-3" /> {tc('byRole')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {ROLES.map(role => (
                          <Badge key={role} variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs"
                            onClick={() => toggleInArray(selectedRoles, role, setSelectedRoles)}>
                            {tc(`role_${role}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowedTargetTypes.includes('groups') && groups.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3 w-3" /> {tc('byGroup')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {groups.map(g => (
                          <Badge key={g.id} variant={selectedGroups.includes(g.id) ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs"
                            onClick={() => toggleInArray(selectedGroups, g.id, setSelectedGroups)}>
                            {g.name_ar || g.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowedTargetTypes.includes('ministries') && ministries.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {tc('byMinistry')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {ministries.map(m => (
                          <Badge key={m.id} variant={selectedMinistries.includes(m.id) ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs"
                            onClick={() => toggleInArray(selectedMinistries, m.id, setSelectedMinistries)}>
                            {m.name_ar || m.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowedTargetTypes.includes('statuses') && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" /> {tc('byStatus')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map(s => (
                          <Badge key={s} variant={selectedStatuses.includes(s) ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs"
                            onClick={() => toggleInArray(selectedStatuses, s, setSelectedStatuses)}>
                            {tc(`status_${s}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowedTargetTypes.includes('visitors') && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <UserPlus className="h-3 w-3" /> {tc('byVisitors')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {VISITOR_STATUSES.map(vs => (
                          <Badge key={vs} variant={selectedVisitorStatuses.includes(vs) ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs"
                            onClick={() => toggleInArray(selectedVisitorStatuses, vs, setSelectedVisitorStatuses)}>
                            {tc(`visitor_${vs}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {allowedTargetTypes.includes('gender') && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Heart className="h-3 w-3" /> {tc('byGender')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {GENDERS.map(g => (
                          <Badge key={g} variant={selectedGender === g ? 'default' : 'outline'}
                            className="cursor-pointer px-2.5 py-1 text-xs"
                            onClick={() => setSelectedGender(selectedGender === g ? '' : g)}>
                            {tc(`gender_${g}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasTargets && (
                <div className="rounded-lg bg-muted/50 p-2.5 flex items-center gap-2">
                  {loadingCount
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Users className="h-3.5 w-3.5 text-primary" />}
                  <span className="text-xs font-medium">
                    {audienceCount
                      ? tc('audiencePreview', { members: audienceCount.profileCount, visitors: audienceCount.visitorCount, total: audienceCount.total })
                      : tc('calculating')}
                  </span>
                </div>
              )}
            </div>

            {/* Message Section */}
            <div className="space-y-3">
              <label className="text-sm font-semibold">{tc('messageTitle')}</label>
              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={tc('titlePlaceholder')}
                  dir="auto"
                  className="text-base min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder={tc('bodyPlaceholder')}
                  rows={3}
                  dir="auto"
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* Sticky Send Button */}
          <div className="border-t px-4 py-3 shrink-0">
            <Button
              className="w-full min-h-[48px] gap-2"
              disabled={!canSubmit}
              onClick={() => setShowConfirm(true)}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? tc('sending') : tc('sendButton')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc('confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {audienceCount ? tc('confirmDescription', { total: audienceCount.total }) : tc('confirmDescriptionGeneric')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('confirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>{tc('confirmSend')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
