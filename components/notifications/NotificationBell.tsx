'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { NotificationList } from './NotificationList'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  payload: Record<string, string>
  status: string
  read_at: string | null
  reference_id: string | null
  reference_type: string | null
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const t = useTranslations('notifications')
  const locale = useLocale()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/notifications?pageSize=15', { signal })
      if (!res.ok) return
      if (signal?.aborted) return
      const json = await res.json()
      setNotifications(json.data || [])
      setUnreadCount(json.unreadCount || 0)
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        // silently fail
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchNotifications(controller.signal)
    return () => controller.abort()
  }, [fetchNotifications])

  // Store user ID for scoping the realtime subscription
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setupSubscription() {
      // Get the current user's ID to scope the subscription
      if (!userIdRef.current) {
        const { data: { user } } = await supabase.auth.getUser()
        userIdRef.current = user?.id ?? null
      }

      const userId = userIdRef.current
      if (!userId) return

      channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications_log',
            filter: `profile_id=eq.${userId}`,
          },
          () => {
            fetchNotifications()
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchNotifications])

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString(), status: 'read' } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      toast.error(t('errorGeneral'))
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString(), status: 'read' })))
      setUnreadCount(0)
    } catch {
      toast.error(t('errorGeneral'))
    }
  }

  const handleNavigate = () => {
    setOpen(false)
    router.push('/notifications')
  }

  // On mobile, tap navigates to /notifications page instead of opening popover
  const handleBellClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      router.push('/notifications')
      return
    }
    setOpen(!open)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:h-8 md:w-8 relative"
          onClick={handleBellClick}
          aria-label={t('title')}
        >
          <Bell className="h-5 w-5 md:h-4 md:w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={locale.startsWith('ar') ? 'start' : 'end'}
        className="w-80 p-0 hidden md:block"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">{t('title')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs gap-1"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('markAllRead')}
            </Button>
          )}
        </div>
        <NotificationList
          notifications={notifications}
          onMarkRead={markRead}
          onNavigate={handleNavigate}
        />
      </PopoverContent>
    </Popover>
  )
}
