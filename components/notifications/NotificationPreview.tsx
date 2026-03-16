'use client'

import { useTranslations } from 'next-intl'
import { Bell, Image as ImageIcon, ExternalLink, Users } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type NotificationPreviewProps = {
  titleAr: string
  bodyAr: string
  titleEn: string
  bodyEn: string
  imageUrl: string
  linkUrl: string
  audienceCount: { profileCount: number; visitorCount: number; total: number } | null
  loading: boolean
}

export function NotificationPreview({
  titleAr,
  bodyAr,
  titleEn,
  bodyEn,
  imageUrl,
  linkUrl,
  audienceCount,
  loading,
}: NotificationPreviewProps) {
  const t = useTranslations('notificationComposer')

  const hasContent = titleAr.trim() || bodyAr.trim()

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{t('preview')}</h3>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
            <Bell className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm text-muted-foreground">{t('emptyHint')}</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Preview card mimicking notification list item */}
            <div className="flex gap-3 p-4">
              <div className="mt-0.5 rounded-lg p-2 shrink-0 bg-blue-100 text-blue-700">
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold" dir="auto">{titleAr || t('previewTitlePlaceholder')}</p>
                <p className="text-sm text-muted-foreground line-clamp-3" dir="auto">
                  {bodyAr || t('previewBodyPlaceholder')}
                </p>

                {imageUrl && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span className="truncate" dir="ltr">{imageUrl}</span>
                  </div>
                )}

                {linkUrl && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="truncate" dir="ltr">{linkUrl}</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">{t('justNow')}</p>
              </div>
            </div>

            {/* English preview if provided */}
            {(titleEn.trim() || bodyEn.trim()) && (
              <div className="border-t px-4 py-3 bg-zinc-50/50">
                <p className="text-xs text-muted-foreground mb-1">English</p>
                {titleEn.trim() && (
                  <p className="text-sm font-medium" dir="ltr">{titleEn}</p>
                )}
                {bodyEn.trim() && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2" dir="ltr">{bodyEn}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audience breakdown */}
      {audienceCount && (
        <div className="rounded-lg border p-3 space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {t('audienceBreakdown')}
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums" dir="ltr">{audienceCount.profileCount}</p>
              <p className="text-xs text-muted-foreground">{t('members')}</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums" dir="ltr">{audienceCount.visitorCount}</p>
              <p className="text-xs text-muted-foreground">{t('visitors')}</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-primary" dir="ltr">{audienceCount.total}</p>
              <p className="text-xs text-muted-foreground">{t('total')}</p>
            </div>
          </div>
        </div>
      )}

      {loading && !audienceCount && (
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground text-center">{t('calculating')}</p>
        </div>
      )}
    </div>
  )
}
