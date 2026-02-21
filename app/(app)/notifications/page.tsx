'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import {
  Bell, BellOff, CheckCheck, ChevronLeft, ChevronRight, Filter,
  Calendar, UserPlus, AlertTriangle, Clock, Info, Loader2,
  Send, Users, Shield, Building2, Heart, X,
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
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────

interface Notification {
  id: string
  type: string
  channel: string
  title: string
  body: string
  payload: Record<string, string>
  status: string
  read_at: string | null
  reference_id: string | null
  reference_type: string | null
  sent_at: string | null
  created_at: string
}

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

// ── Constants ────────────────────────────────────────

const NOTIFICATION_TYPES = [
  'all', 'gathering_reminder', 'visitor_assigned', 'visitor_welcome',
  'at_risk_alert', 'visitor_sla_warning', 'event_reminder', 'general',
] as const

const typeIcons: Record<string, React.ElementType> = {
  gathering_reminder: Calendar, visitor_assigned: UserPlus, visitor_welcome: UserPlus,
  at_risk_alert: AlertTriangle, visitor_sla_warning: Clock, event_reminder: Calendar, general: Info,
}

const typeColors: Record<string, string> = {
  gathering_reminder: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  visitor_assigned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  visitor_welcome: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  at_risk_alert: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  visitor_sla_warning: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  event_reminder: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

const ROLES = ['member', 'group_leader', 'ministry_leader', 'super_admin'] as const
const STATUSES = ['active', 'at_risk', 'inactive'] as const
const VISITOR_STATUSES = ['new', 'assigned', 'contacted'] as const
const GENDERS = ['male', 'female'] as const

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (locale === 'ar') {
    if (diffMins < 1) return 'الآن'
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 7) return `منذ ${diffDays} يوم`
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Page Component ───────────────────────────────────

export default function NotificationsPage() {
  const t = useTranslations('notificationsPage')
  const tc = useTranslations('notificationComposer')
  const locale = useLocale()
  const router = useRouter()

  // User role
  const [userRole, setUserRole] = useState<string | null>(null)

  // Notification list state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [typeFilter, setTypeFilter] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  // Compose panel state (admin only)
  const [showCompose, setShowCompose] = useState(false)
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
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [ministries, setMinistries] = useState<MinistryOption[]>([])
  const [audienceCount, setAudienceCount] = useState<{ profileCount: number; visitorCount: number; total: number } | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const PAGE_SIZE = 20
  const isAdmin = userRole === 'super_admin' || userRole === 'ministry_leader'

  // Load user role
  useEffect(() => {
    async function loadRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (data) setUserRole(data.role)
    }
    loadRole()
  }, [])

  // Load groups/ministries when compose opens
  useEffect(() => {
    if (!showCompose) return
    async function loadOptions() {
      const [groupsRes, ministriesRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/ministries'),
      ])
      if (groupsRes.ok) {
        const json = await groupsRes.json()
        setGroups((json.data || json) as GroupOption[])
      }
      if (ministriesRes.ok) {
        const json = await ministriesRes.json()
        setMinistries((json.data || json) as MinistryOption[])
      }
    }
    loadOptions()
  }, [showCompose])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (showUnreadOnly) params.set('unread', 'true')
      if (typeFilter !== 'all') params.set('type', typeFilter)

      const res = await fetch(`/api/notifications?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data || [])
      setTotalPages(json.totalPages || 1)
      setUnreadCount(json.unreadCount || 0)
      setTotalCount(json.count || 0)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, showUnreadOnly])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_log', filter: 'channel=eq.in_app' }, () => fetchNotifications())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString(), status: 'read' } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString(), status: 'read' })))
    setUnreadCount(0)
  }

  const handleNavigate = (n: Notification) => {
    if (!n.read_at) markRead(n.id)
    if (n.reference_type === 'visitor') router.push('/admin/visitors')
    else if (n.reference_type === 'gathering') router.push('/groups')
    else if (n.reference_type === 'profile' && n.reference_id) router.push(`/admin/members/${n.reference_id}`)
    else if (n.reference_type === 'event' && n.reference_id) router.push(`/events/${n.reference_id}`)
  }

  // ── Compose helpers ──────────────────────────────────

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
    if (!showCompose) return
    const targets = buildTargets()
    if (!targets.length) { setAudienceCount(null); return }
    setLoadingCount(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/notifications/audience', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets }),
        })
        if (res.ok) setAudienceCount(await res.json())
      } catch { /* ignore */ } finally { setLoadingCount(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [buildTargets, showCompose])

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
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(tc('sendFailed'), { description: json.error })
        return
      }
      const json = await res.json()
      toast.success(tc('sendSuccess'), { description: tc('sentCount', { count: json.sent }) })
      // Reset compose form
      setTitleAr(''); setTitleEn(''); setBodyAr(''); setBodyEn('')
      setAllChurch(false); setSelectedRoles([]); setSelectedGroups([])
      setSelectedMinistries([]); setSelectedStatuses([]); setSelectedVisitorStatuses([])
      setSelectedGender(''); setShowCompose(false)
    } catch {
      toast.error(tc('sendFailed'))
    } finally {
      setSending(false)
    }
  }

  const hasTargets = buildTargets().length > 0
  const canSend = hasTargets && titleAr.trim() && bodyAr.trim() && !sending

  // ── Render ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle', { count: totalCount, unread: unreadCount })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              {t('markAllRead')}
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setShowCompose(!showCompose)}
              className="gap-1.5"
              variant={showCompose ? 'secondary' : 'default'}
            >
              {showCompose ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {showCompose ? tc('closeCompose') : tc('sendButton')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Compose Panel (admin only) ───────────────── */}
      {showCompose && isAdmin && (
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
              {/* All Church */}
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

              {!allChurch && (
                <>
                  {/* Roles */}
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

                  {/* Groups */}
                  {groups.length > 0 && (
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

                  {/* Ministries */}
                  {ministries.length > 0 && (
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

                  {/* Status */}
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

                  {/* Visitors */}
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

                  {/* Gender */}
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
                </>
              )}

              {/* Audience Preview */}
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
            </CardContent>
          </Card>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button size="lg" disabled={!canSend} onClick={() => setShowConfirm(true)} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? tc('sending') : tc('sendButton')}
            </Button>
          </div>

          <Separator />
        </div>
      )}

      {/* ── Filters ──────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-auto min-w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_TYPES.map(type => (
                <SelectItem key={type} value={type}>{t(`types.${type}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant={showUnreadOnly ? 'default' : 'outline'} size="sm"
          onClick={() => { setShowUnreadOnly(!showUnreadOnly); setPage(1) }} className="gap-1.5">
          {showUnreadOnly ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          {t('unreadOnly')}
        </Button>
      </div>

      {/* ── Notification List ────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-muted-foreground">{t('empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] || Info
              const isUnread = !n.read_at
              const colorClass = typeColors[n.type] || typeColors.general

              return (
                <button key={n.id} onClick={() => handleNavigate(n)}
                  className={`w-full text-start p-4 hover:bg-muted/50 transition-colors flex gap-4 ${isUnread ? 'bg-primary/5' : ''}`}>
                  <div className={`mt-0.5 rounded-lg p-2 shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                      </div>
                      {isUnread && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t(`types.${n.type}`)}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(n.created_at, locale)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Pagination ───────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t('page', { current: page, total: totalPages })}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ───────────────────────────── */}
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
    </div>
  )
}
