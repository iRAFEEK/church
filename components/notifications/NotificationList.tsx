'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Users, Calendar, AlertTriangle, UserPlus, Clock, Info, HandHelping, MessageCircle, Bell } from 'lucide-react'
import { timeAgo } from '@/lib/utils/time-ago'

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
  need_response_received: HandHelping,
  need_response_status_changed: HandHelping,
  need_message: MessageCircle,
  general: Info,
}


export function NotificationList({ notifications, onMarkRead, onNavigate }: NotificationListProps) {
  const locale = useLocale()
  const t = useTranslations('notifications')

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
        <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
          <Bell className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-1">{t('emptyTitle')}</h3>
        <p className="text-xs text-zinc-500 max-w-[220px]">{t('emptyBody')}</p>
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
