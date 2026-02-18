'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
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
  const t = useTranslations('notifications')
  const locale = useLocale()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?pageSize=15')
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data || [])
      setUnreadCount(json.unreadCount || 0)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time subscription for new notifications
  useEffect(() => {
    const supabase = createBrowserClient()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications_log',
          filter: `channel=eq.in_app`,
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
      // silently fail
    }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString(), status: 'read' })))
      setUnreadCount(0)
    } catch {
      // silently fail
    }
  }

  const handleNavigate = (notification: Notification) => {
    setOpen(false)
    // Navigate based on reference type
    if (notification.reference_type === 'visitor' && notification.reference_id) {
      window.location.href = '/admin/visitors'
    } else if (notification.reference_type === 'gathering' && notification.reference_id) {
      window.location.href = `/groups`
    } else if (notification.reference_type === 'profile' && notification.reference_id) {
      window.location.href = `/admin/members/${notification.reference_id}`
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={locale === 'ar' ? 'start' : 'end'}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">{t('title')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
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
