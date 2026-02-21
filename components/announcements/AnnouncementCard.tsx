'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Pin, Calendar } from 'lucide-react'
import type { Announcement } from '@/types'

interface AnnouncementCardProps {
  announcement: Announcement
  admin?: boolean
}

export function AnnouncementCard({ announcement, admin }: AnnouncementCardProps) {
  const t = useTranslations('announcements')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const title = isAr ? (announcement.title_ar || announcement.title) : announcement.title
  const body = isAr ? (announcement.body_ar || announcement.body) : announcement.body
  const href = admin
    ? `/admin/announcements/${announcement.id}`
    : `/announcements/${announcement.id}`

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-zinc-100 text-zinc-600',
  }

  return (
    <Link href={href} className="block p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        {announcement.is_pinned && (
          <Pin className="h-4 w-4 text-primary mt-1 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{title}</p>
            {admin && (
              <Badge className={statusColors[announcement.status] || ''} variant="secondary">
                {t(`status_${announcement.status}`)}
              </Badge>
            )}
          </div>
          {body && (
            <p className="text-sm text-muted-foreground line-clamp-2">{body}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {announcement.published_at
              ? new Date(announcement.published_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
              : new Date(announcement.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
            }
            {announcement.expires_at && (
              <span>· {t('expiresOn')} {new Date(announcement.expires_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
