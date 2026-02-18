'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Users, Calendar, AlertTriangle, UserPlus, Clock, Info } from 'lucide-react'

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

interface NotificationListProps {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onNavigate?: (notification: Notification) => void
}

const typeIcons: Record<string, React.ElementType> = {
  gathering_reminder: Calendar,
  visitor_assigned: UserPlus,
  visitor_welcome: UserPlus,
  at_risk_alert: AlertTriangle,
  visitor_sla_warning: Clock,
  event_reminder: Calendar,
  general: Info,
}

function timeAgo(dateStr: string, locale: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (locale === 'ar') {
    if (minutes < 1) return 'الآن'
    if (minutes < 60) return `منذ ${minutes} دقيقة`
    if (hours < 24) return `منذ ${hours} ساعة`
    return `منذ ${days} يوم`
  }

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function NotificationList({ notifications, onMarkRead, onNavigate }: NotificationListProps) {
  const locale = useLocale()
  const t = useTranslations('notifications')

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        {t('empty')}
      </div>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      {notifications.map((n) => {
        const Icon = typeIcons[n.type] || Info
        const isUnread = !n.read_at

        return (
          <button
            key={n.id}
            className={`w-full text-start p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 flex gap-3 ${
              isUnread ? 'bg-muted/30' : ''
            }`}
            onClick={() => {
              if (isUnread) onMarkRead(n.id)
              onNavigate?.(n)
            }}
          >
            <div className={`mt-0.5 rounded-full p-1.5 ${isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
                {n.title}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {timeAgo(n.created_at, locale)}
              </p>
            </div>
            {isUnread && (
              <div className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
