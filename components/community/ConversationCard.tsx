'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { timeAgo } from '@/lib/utils/time-ago'

interface ConversationCardProps {
  responseId: string
  needId: string
  needTitle: string
  needTitleAr: string | null
  otherChurch: { id: string; name: string; name_ar: string | null; logo_url: string | null }
  lastMessage: string
  lastMessageAr: string | null
  lastMessageAt: string
  unreadCount: number
}

export function ConversationCard({
  responseId,
  needId,
  needTitle,
  needTitleAr,
  otherChurch,
  lastMessage,
  lastMessageAr,
  lastMessageAt,
  unreadCount,
}: ConversationCardProps) {
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const churchName = isAr ? (otherChurch.name_ar || otherChurch.name) : otherChurch.name
  const title = isAr ? (needTitleAr || needTitle) : needTitle
  const message = isAr ? (lastMessageAr || lastMessage) : lastMessage

  return (
    <Link
      href={`/community/needs/${needId}?openThread=${responseId}`}
      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors active:bg-muted min-h-[56px]"
    >
      {/* Church logo */}
      <div className="shrink-0 mt-0.5">
        {otherChurch.logo_url ? (
          <img src={otherChurch.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            {churchName?.charAt(0) || '?'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
            {churchName}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {timeAgo(lastMessageAt, locale)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{title}</p>
        <p className={`text-sm truncate mt-0.5 ${unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
          {message}
        </p>
      </div>

      {/* Unread indicator */}
      {unreadCount > 0 && (
        <div className="shrink-0 self-center">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-1.5">
            {unreadCount}
          </span>
        </div>
      )}
    </Link>
  )
}
