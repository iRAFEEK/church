'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Send, Users, Shield, Building2, Heart, X, Info, Loader2,
  UserPlus, AlertTriangle, Image, Link as LinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
}

export function NotificationComposer({
  allowedTargetTypes, isUnscoped, userRole,
  initialGroups, initialMinistries, onClose,
}: NotificationComposerProps) {
  const tc = useTranslations('notificationComposer')

  const [allChurch, setAllChurch] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedVisitorStatuses, setSelectedVisitorStatuses] = useState<string[]>([])
  const [selectedGender, setSelectedGender] = useState<string>('')
  const [titleAr, setTitleAr] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyAr, setBodyAr] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [groups, setGroups] = useState<GroupOption[]>(initialGroups)
  const [ministries, setMinistries] = useState<MinistryOption[]>(initialMinistries)
  const [audienceCount, setAudienceCount] = useState<{ profileCount: number; visitorCount: number; total: number } | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
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
          titleAr, titleEn: titleEn || undefined,
          bodyAr, bodyEn: bodyEn || undefined,
          targets: buildTargets(),
          imageUrl: imageUrl.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined,
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
  const canSubmit = hasTargets && titleAr.trim() && bodyAr.trim() && !sending

  return (
    <>
      <div className="space-y-4">
        {/* Audience */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {tc('audienceTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isUnscoped && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
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
                className={`w-full p-3 rounded-lg border-2 text-start transition-colors ${
                  allChurch ? 'border-primary bg-primary/5 text-primary' : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{tc('allChurch')}</span>
                </div>
              </button>
            )}

            {!allChurch && (
              <>
                {allowedTargetTypes.includes('roles') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> {tc('byRole')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map(role => (
                        <Badge key={role} variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5"
                          onClick={() => toggleInArray(selectedRoles, role, setSelectedRoles)}>
                          {tc(`role_${role}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {allowedTargetTypes.includes('groups') && groups.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> {tc('byGroup')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {groups.map(g => (
                        <Badge key={g.id} variant={selectedGroups.includes(g.id) ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5"
                          onClick={() => toggleInArray(selectedGroups, g.id, setSelectedGroups)}>
                          {g.name_ar || g.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {allowedTargetTypes.includes('ministries') && ministries.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> {tc('byMinistry')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ministries.map(m => (
                        <Badge key={m.id} variant={selectedMinistries.includes(m.id) ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5"
                          onClick={() => toggleInArray(selectedMinistries, m.id, setSelectedMinistries)}>
                          {m.name_ar || m.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {allowedTargetTypes.includes('statuses') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> {tc('byStatus')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map(s => (
                        <Badge key={s} variant={selectedStatuses.includes(s) ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5"
                          onClick={() => toggleInArray(selectedStatuses, s, setSelectedStatuses)}>
                          {tc(`status_${s}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {allowedTargetTypes.includes('visitors') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" /> {tc('byVisitors')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {VISITOR_STATUSES.map(vs => (
                        <Badge key={vs} variant={selectedVisitorStatuses.includes(vs) ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5"
                          onClick={() => toggleInArray(selectedVisitorStatuses, vs, setSelectedVisitorStatuses)}>
                          {tc(`visitor_${vs}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {allowedTargetTypes.includes('gender') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5" /> {tc('byGender')}
                    </label>
                    <Select value={selectedGender || 'none'} onValueChange={(v) => setSelectedGender(v === 'none' ? '' : v)}>
                      <SelectTrigger className="w-auto min-w-[160px]">
                        <SelectValue placeholder={tc('genderPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tc('genderAll')}</SelectItem>
                        {GENDERS.map(g => (
                          <SelectItem key={g} value={g}>{tc(`gender_${g}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {hasTargets && (
              <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-2">
                {loadingCount
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Users className="h-4 w-4 text-primary" />}
                <span className="text-sm font-medium">
                  {audienceCount
                    ? tc('audiencePreview', { members: audienceCount.profileCount, visitors: audienceCount.visitorCount, total: audienceCount.total })
                    : tc('calculating')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{tc('messageTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{tc('titleAr')} *</label>
              <Input value={titleAr} onChange={e => setTitleAr(e.target.value)} placeholder={tc('titleArPlaceholder')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tc('bodyAr')} *</label>
              <Textarea value={bodyAr} onChange={e => setBodyAr(e.target.value)} placeholder={tc('bodyArPlaceholder')} rows={3} />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{tc('titleEn')}</label>
              <Input dir="ltr" value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder={tc('titleEnPlaceholder')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{tc('bodyEn')}</label>
              <Textarea dir="ltr" value={bodyEn} onChange={e => setBodyEn(e.target.value)} placeholder={tc('bodyEnPlaceholder')} rows={2} />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5" /> {tc('imageUrl')}
              </label>
              <Input dir="ltr" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder={tc('imageUrlPlaceholder')} type="url" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> {tc('linkUrl')}
              </label>
              <Input dir="ltr" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder={tc('linkUrlPlaceholder')} type="url" />
            </div>
          </CardContent>
        </Card>

        {/* Send Button */}
        <div className="flex justify-end">
          <Button size="lg" disabled={!canSubmit} onClick={() => setShowConfirm(true)} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? tc('sending') : tc('sendButton')}
          </Button>
        </div>

        <Separator />
      </div>

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
