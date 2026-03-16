'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Send, Users, Shield, Building2, Heart, X, Info, Loader2,
  UserPlus, AlertTriangle, ChevronDown, ChevronUp,
  Upload, Link as LinkIcon, Trash2,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import { NotificationPreview } from '@/components/notifications/NotificationPreview'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'

// ── Types ─────────────────────────────────────────────

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

type NotificationComposerProps = {
  allowedTargetTypes: string[]
  isUnscoped: boolean
  userRole: string | null
  initialGroups: GroupOption[]
  initialMinistries: MinistryOption[]
  onClose: () => void
  open: boolean
}

// ── Component ─────────────────────────────────────────

export function NotificationComposer({
  allowedTargetTypes, isUnscoped, userRole,
  initialGroups, initialMinistries, onClose, open,
}: NotificationComposerProps) {
  const tc = useTranslations('notificationComposer')
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Audience state
  const [allChurch, setAllChurch] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedVisitorStatuses, setSelectedVisitorStatuses] = useState<string[]>([])
  const [selectedGender, setSelectedGender] = useState<string>('')

  // Message state — single title/body (sent as both AR and EN)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  // Mobile collapse toggles
  const [showMedia, setShowMedia] = useState(false)

  // Data state
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
          // silently fail — options are supplementary
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

  const handleSend = async () => {
    if (sending) return
    setShowConfirm(false)
    setSending(true)
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleAr: title,
          titleEn: title,
          bodyAr: body,
          bodyEn: body,
          targets: buildTargets(),
          imageUrl: imageUrl || undefined,
          linkUrl: linkUrl || undefined,
        }),
      })
      if (!res.ok) {
        toast.error(tc('sendFailed'))
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
  const canSubmit = hasTargets && title.trim() && body.trim() && !sending && !uploading

  // Build options for multi-selects
  const roleOptions = ROLES.map(r => ({ value: r, label: tc(`role_${r}`) }))
  const groupOptions = groups.map(g => ({ value: g.id, label: g.name_ar || g.name }))
  const ministryOptions = ministries.map(m => ({ value: m.id, label: m.name_ar || m.name }))
  const statusOptions = STATUSES.map(s => ({ value: s, label: tc(`status_${s}`) }))
  const visitorStatusOptions = VISITOR_STATUSES.map(vs => ({ value: vs, label: tc(`visitor_${vs}`) }))

  // ── Shared content ────────────────────────────────────

  const audienceSection = (
    <div className="space-y-4">
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

      {/* Entire Church toggle */}
      {allowedTargetTypes.includes('all_church') && (
        <div className="flex items-center justify-between rounded-lg border p-3 min-h-[44px]">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">{tc('allChurch')}</span>
          </div>
          <Switch
            checked={allChurch}
            onCheckedChange={(checked) => {
              setAllChurch(checked)
              if (checked) {
                setSelectedRoles([]); setSelectedGroups([]); setSelectedMinistries([])
                setSelectedStatuses([]); setSelectedVisitorStatuses([]); setSelectedGender('')
              }
            }}
          />
        </div>
      )}

      {!allChurch && (
        <div className="space-y-3">
          {allowedTargetTypes.includes('roles') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Shield className="h-3 w-3" /> {tc('byRole')}
              </label>
              <MultiSelect
                options={roleOptions}
                selected={selectedRoles}
                onChange={setSelectedRoles}
                placeholder={tc('selectRoles')}
              />
            </div>
          )}

          {allowedTargetTypes.includes('groups') && groupOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3 w-3" /> {tc('byGroup')}
              </label>
              <MultiSelect
                options={groupOptions}
                selected={selectedGroups}
                onChange={setSelectedGroups}
                placeholder={tc('selectGroups')}
              />
            </div>
          )}

          {allowedTargetTypes.includes('ministries') && ministryOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3 w-3" /> {tc('byMinistry')}
              </label>
              <MultiSelect
                options={ministryOptions}
                selected={selectedMinistries}
                onChange={setSelectedMinistries}
                placeholder={tc('selectMinistries')}
              />
            </div>
          )}

          {allowedTargetTypes.includes('statuses') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="h-3 w-3" /> {tc('byStatus')}
              </label>
              <MultiSelect
                options={statusOptions}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
                placeholder={tc('selectStatuses')}
              />
            </div>
          )}

          {allowedTargetTypes.includes('visitors') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <UserPlus className="h-3 w-3" /> {tc('byVisitors')}
              </label>
              <MultiSelect
                options={visitorStatusOptions}
                selected={selectedVisitorStatuses}
                onChange={setSelectedVisitorStatuses}
                placeholder={tc('selectVisitors')}
              />
            </div>
          )}

          {allowedTargetTypes.includes('gender') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Heart className="h-3 w-3" /> {tc('byGender')}
              </label>
              <Select value={selectedGender || '__none__'} onValueChange={(v) => setSelectedGender(v === '__none__' ? '' : v)}>
                <SelectTrigger className="w-full min-h-[44px] text-base">
                  <SelectValue placeholder={tc('genderPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tc('genderAll')}</SelectItem>
                  {GENDERS.map(g => (
                    <SelectItem key={g} value={g}>{tc(`gender_${g}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Audience count bar */}
      <div className={`rounded-lg p-2.5 flex items-center gap-2 ${
        hasTargets ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
      }`}>
        {loadingCount
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Users className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium">
          {audienceCount
            ? tc('audiencePreview', { members: audienceCount.profileCount, visitors: audienceCount.visitorCount, total: audienceCount.total })
            : hasTargets
              ? tc('calculating')
              : tc('selectAudience')}
        </span>
      </div>
    </div>
  )

  // Image upload handler — uses server-side API to bypass storage RLS
  const fileInputRef = useRef<HTMLInputElement>(null)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error(tc('invalidImage')); return }
    if (file.size > 5 * 1024 * 1024) { toast.error(tc('imageTooLarge')); return }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'notifications')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        toast.error(tc('uploadFailed'))
        return
      }
      const json = await res.json()
      setImageUrl(json.url)
    } catch {
      toast.error(tc('uploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const messageSection = (
    <div className="space-y-4">
      <label className="text-sm font-semibold">{tc('messageTitle')}</label>

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">{tc('notifTitle')}</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={tc('titlePlaceholder')}
          dir="auto"
          className="text-base min-h-[44px]"
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <Label className="text-xs">{tc('notifBody')}</Label>
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={tc('bodyPlaceholder')}
          rows={4}
          dir="auto"
          className="text-base"
        />
      </div>

      {/* Image upload */}
      {isDesktop || showMedia ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Upload className="h-3 w-3" /> {tc('attachImage')}
            </Label>
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border bg-zinc-50">
                <Image
                  src={imageUrl}
                  alt=""
                  width={400}
                  height={200}
                  className="w-full h-40 object-cover"
                  unoptimized
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 end-2 h-8 w-8"
                  onClick={() => setImageUrl('')}
                  aria-label={tc('removeImage')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full min-h-[80px] rounded-lg border-2 border-dashed border-zinc-300 hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-sm text-zinc-500 hover:text-primary transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {uploading ? tc('uploadingImage') : tc('clickToUpload')}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Link URL */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3" /> {tc('linkUrl')}
            </Label>
            <Input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder={tc('linkUrlPlaceholder')}
              dir="ltr"
              type="url"
              className="text-base min-h-[44px]"
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowMedia(!showMedia)}
          className="flex items-center gap-2 text-sm text-primary hover:underline min-h-[44px]"
        >
          {showMedia ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {tc('addImageLink')}
        </button>
      )}
    </div>
  )

  const previewSection = (
    <NotificationPreview
      titleAr={title}
      bodyAr={body}
      titleEn={title}
      bodyEn={body}
      imageUrl={imageUrl}
      linkUrl={linkUrl}
      audienceCount={audienceCount}
      loading={loadingCount}
    />
  )

  // ── Desktop: Dialog ───────────────────────────────────

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
          <DialogContent className="md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {tc('sheetTitle')}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden grid grid-cols-5 min-h-0">
              {/* Left column: Audience + Message (3/5) */}
              <div className="col-span-3 overflow-y-auto px-6 py-4 space-y-6 border-e">
                {audienceSection}
                {messageSection}
              </div>

              {/* Right column: Preview (2/5) */}
              <div className="col-span-2 overflow-y-auto px-6 py-4 bg-zinc-50/50">
                {previewSection}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0">
              <Button variant="outline" onClick={onClose} className="min-h-[44px]">
                {tc('cancel')}
              </Button>
              <Button
                disabled={!canSubmit}
                onClick={() => setShowConfirm(true)}
                className="min-h-[44px] gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? tc('sending') : tc('sendButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmSendDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          onConfirm={handleSend}
          audienceCount={audienceCount}
        />
      </>
    )
  }

  // ── Mobile: Sheet ─────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-2xl">
          <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                {tc('sheetTitle')}
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9" aria-label={tc('cancel')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {audienceSection}
            {messageSection}
            {previewSection}
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

      <ConfirmSendDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleSend}
        audienceCount={audienceCount}
      />
    </>
  )
}

// ── Confirmation Dialog (shared) ──────────────────────

type ConfirmSendDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  audienceCount: { total: number } | null
}

function ConfirmSendDialog({ open, onOpenChange, onConfirm, audienceCount }: ConfirmSendDialogProps) {
  const tc = useTranslations('notificationComposer')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tc('confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {audienceCount ? tc('confirmDescription', { total: audienceCount.total }) : tc('confirmDescriptionGeneric')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('confirmCancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{tc('confirmSend')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
