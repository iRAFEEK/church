'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import dynamic from 'next/dynamic'
import {
  Bell, BellOff, CheckCheck, ChevronLeft, ChevronRight, Filter,
  Calendar, UserPlus, AlertTriangle, Clock, Info, Loader2,
  Send, X, Image as ImageIcon, Link as LinkIcon, ExternalLink,
  HandHelping, MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

const NotificationComposer = dynamic(
  () => import('@/components/notifications/NotificationComposer').then(m => ({ default: m.NotificationComposer })),
  {
    ssr: false,
    loading: () => <div className="h-32 rounded-lg bg-zinc-100 animate-pulse" />,
  }
)

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

interface GroupOption { id: string; name: string; name_ar: string | null }
interface MinistryOption { id: string; name: string; name_ar: string | null }

// ── Constants ────────────────────────────────────────

const NOTIFICATION_TYPES = [
  'all', 'gathering_reminder', 'visitor_assigned', 'visitor_welcome',
  'at_risk_alert', 'visitor_sla_warning', 'event_reminder',
  'event_service_request', 'event_service_assigned', 'event_service_response',
  'need_response_received', 'need_response_status_changed', 'need_message',
  'general',
] as const

const typeIcons: Record<string, React.ElementType> = {
  gathering_reminder: Calendar, visitor_assigned: UserPlus, visitor_welcome: UserPlus,
  at_risk_alert: AlertTriangle, visitor_sla_warning: Clock, event_reminder: Calendar,
  need_response_received: HandHelping, need_response_status_changed: HandHelping, need_message: MessageCircle,
  general: Info,
}

const typeColors: Record<string, string> = {
  gathering_reminder: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  visitor_assigned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  visitor_welcome: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  at_risk_alert: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  visitor_sla_warning: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  event_reminder: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  need_response_received: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  need_response_status_changed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  need_message: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (locale.startsWith('ar')) {
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

  // User role & scopes
  const [userRole, setUserRole] = useState<string | null>(null)
  const [canSend, setCanSend] = useState(false)
  const [allowedTargetTypes, setAllowedTargetTypes] = useState<string[]>([])
  const [isUnscoped, setIsUnscoped] = useState(false)
  const [scopedGroups, setScopedGroups] = useState<GroupOption[]>([])
  const [scopedMinistries, setScopedMinistries] = useState<MinistryOption[]>([])

  // Notification list state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [typeFilter, setTypeFilter] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  // Compose panel state
  const [showCompose, setShowCompose] = useState(false)

  // Detail dialog state
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const PAGE_SIZE = 20

  // Load user scopes on mount
  useEffect(() => {
    const controller = new AbortController()
    async function loadScopes() {
      try {
        const res = await fetch('/api/notifications/scopes', { signal: controller.signal })
        if (!res.ok || controller.signal.aborted) return
        const data = await res.json()
        if (controller.signal.aborted) return
        setUserRole(data.role)
        setCanSend(data.canSend)
        setAllowedTargetTypes(data.allowedTargetTypes || [])
        setIsUnscoped(data.isUnscoped)
        if (data.canSend && !data.isUnscoped) {
          if (data.ministries?.length) setScopedMinistries(data.ministries)
          if (data.groups?.length) setScopedGroups(data.groups)
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') { /* ignore */ }
      }
    }
    loadScopes()
    return () => controller.abort()
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (showUnreadOnly) params.set('unread', 'true')
      if (typeFilter !== 'all') params.set('type', typeFilter)

      const res = await fetch(`/api/notifications?${params}`, signal ? { signal } : undefined)
      if (!res.ok || signal?.aborted) return
      const json = await res.json()
      if (signal?.aborted) return
      setNotifications(json.data || [])
      setTotalPages(json.totalPages || 1)
      setUnreadCount(json.unreadCount || 0)
      setTotalCount(json.count || 0)
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') { /* silently fail */ }
    } finally {
      if (!(signal?.aborted)) setLoading(false)
    }
  }, [page, typeFilter, showUnreadOnly])

  useEffect(() => {
    const controller = new AbortController()
    fetchNotifications(controller.signal)
    return () => controller.abort()
  }, [fetchNotifications])

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
    const prevNotifications = notifications
    const prevCount = unreadCount
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString(), status: 'read' } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    if (!res.ok) { setNotifications(prevNotifications); setUnreadCount(prevCount) }
  }

  const markAllRead = async () => {
    const prevNotifications = notifications
    const prevCount = unreadCount
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString(), status: 'read' })))
    setUnreadCount(0)
    const res = await fetch('/api/notifications/read-all', { method: 'PATCH' })
    if (!res.ok) { setNotifications(prevNotifications); setUnreadCount(prevCount) }
  }

  const handleNotificationClick = (n: Notification) => {
    if (!n.read_at) markRead(n.id)
    setSelectedNotification(n)
  }

  const getNotificationLink = (n: Notification): string | null => {
    if (n.reference_type === 'visitor') return '/admin/visitors'
    if (n.reference_type === 'gathering') return '/groups'
    if (n.reference_type === 'profile' && n.reference_id) return `/admin/members/${n.reference_id}`
    if (n.reference_type === 'event' && n.reference_id) return `/events/${n.reference_id}`
    if (n.reference_type === 'church_need' && n.reference_id) {
      const base = `/community/needs/${n.reference_id}`
      if (n.type === 'need_message' && n.payload?.responseId) {
        return `${base}?openThread=${n.payload.responseId}`
      }
      return base
    }
    return null
  }

  // ── Render ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          {canSend && (
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

      {/* Compose Panel (admin only, lazy-loaded) */}
      {showCompose && canSend && (
        <NotificationComposer
          allowedTargetTypes={allowedTargetTypes}
          isUnscoped={isUnscoped}
          userRole={userRole}
          initialGroups={scopedGroups}
          initialMinistries={scopedMinistries}
          onClose={() => setShowCompose(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[160px] h-9 text-sm">
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
          onClick={() => { setShowUnreadOnly(!showUnreadOnly); setPage(1) }} className="gap-1.5 w-full sm:w-auto">
          {showUnreadOnly ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          {t('unreadOnly')}
        </Button>
      </div>

      {/* Notification List */}
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
                <button key={n.id} onClick={() => handleNotificationClick(n)}
                  className={`w-full text-start p-4 hover:bg-muted/50 transition-colors flex gap-4 ${isUnread ? 'bg-primary/5' : ''}`}>
                  <div className={`mt-0.5 rounded-lg p-2 shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 mt-1.5">
                        {n.payload?.imageUrl && <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                        {n.payload?.linkUrl && <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                        {isUnread && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t('page', { current: page, total: totalPages })}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => { if (!open) setSelectedNotification(null) }}>
        <DialogContent>
          {selectedNotification && (() => {
            const sn = selectedNotification
            const DetailIcon = typeIcons[sn.type] || Info
            const detailColor = typeColors[sn.type] || typeColors.general

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${detailColor}`}>
                      <DetailIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-base">{sn.title}</DialogTitle>
                      <DialogDescription asChild>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t(`types.${sn.type}`)}</Badge>
                          <span>{formatDate(sn.created_at, locale)}</span>
                        </div>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {sn.payload?.imageUrl && (
                    <div className="relative rounded-lg overflow-hidden border aspect-video bg-muted">
                      <Image
                        src={sn.payload.imageUrl}
                        alt={sn.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 500px"
                      />
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{sn.body}</p>

                  {sn.payload?.linkUrl && (
                    <a
                      href={sn.payload.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-lg bg-muted/50 border"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="truncate">{sn.payload.linkUrl}</span>
                    </a>
                  )}

                  {getNotificationLink(sn) && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        const link = getNotificationLink(sn)
                        if (link) {
                          setSelectedNotification(null)
                          router.push(link)
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('viewRelated')}
                    </Button>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
