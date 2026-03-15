'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EyeOff, Heart } from 'lucide-react'
import { toast } from 'sonner'

type Submitter = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

export type FeedPrayer = {
  id: string
  content: string
  is_anonymous: boolean
  is_private: boolean
  status: string
  created_at: string
  submitter: Submitter | null
  prayer_count: number
  is_praying: boolean
}

type PrayerFeedCardProps = {
  prayer: FeedPrayer
}

export function PrayerFeedCard({ prayer }: PrayerFeedCardProps) {
  const t = useTranslations('churchPrayer')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [isPraying, setIsPraying] = useState(prayer.is_praying)
  const [prayerCount, setPrayerCount] = useState(prayer.prayer_count)
  const [isToggling, setIsToggling] = useState(false)

  const submitterName = prayer.submitter
    ? isAr
      ? `${prayer.submitter.first_name_ar || prayer.submitter.first_name || ''} ${prayer.submitter.last_name_ar || prayer.submitter.last_name || ''}`.trim()
      : `${prayer.submitter.first_name || ''} ${prayer.submitter.last_name || ''}`.trim()
    : null

  const initials = submitterName
    ? submitterName.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  const relativeTime = new Date(prayer.created_at).toLocaleDateString(
    isAr ? 'ar-EG' : 'en-US',
    { month: 'short', day: 'numeric' }
  )

  const handleTogglePray = async () => {
    if (isToggling) return
    setIsToggling(true)

    // Optimistic update
    const wasPraying = isPraying
    const prevCount = prayerCount
    setIsPraying(!wasPraying)
    setPrayerCount(wasPraying ? Math.max(0, prevCount - 1) : prevCount + 1)

    try {
      const res = await fetch(`/api/church-prayers/${prayer.id}/pray`, {
        method: wasPraying ? 'DELETE' : 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setIsPraying(data.praying)
        setPrayerCount(data.count)
      } else {
        // Rollback
        setIsPraying(wasPraying)
        setPrayerCount(prevCount)
        toast.error(t('error.pray'))
      }
    } catch {
      // Rollback
      setIsPraying(wasPraying)
      setPrayerCount(prevCount)
      toast.error(t('error.pray'))
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Card className="border-zinc-100 shadow-sm">
      <CardContent className="pt-4 pb-3 px-4">
        {/* Header: submitter info */}
        <div className="flex items-center gap-2.5 mb-3">
          {prayer.is_anonymous || !prayer.submitter ? (
            <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
              <EyeOff className="h-4 w-4 text-zinc-400" />
            </div>
          ) : (
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={prayer.submitter.photo_url || undefined} />
              <AvatarFallback className="text-xs bg-zinc-100 text-zinc-600">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 truncate">
              {prayer.is_anonymous || !submitterName
                ? t('aMember')
                : submitterName}
            </p>
            <p className="text-xs text-zinc-500">{relativeTime}</p>
          </div>
        </div>

        {/* Prayer content */}
        <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap mb-3">
          {prayer.content}
        </p>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleTogglePray}
            disabled={isToggling}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium transition-all active:scale-95 ${
              isPraying
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isPraying ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
              }`}
            />
            <span>
              {isPraying ? t('praying') : t('imPraying')}
            </span>
          </button>

          {prayerCount > 0 && (
            <span className="text-xs text-zinc-500">
              {t('prayingCount', { count: prayerCount })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
