'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { PrayerFeedCard, type FeedPrayer } from './PrayerFeedCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { HandHeart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type PrayerFeedProps = {
  refreshKey: number
}

export function PrayerFeed({ refreshKey }: PrayerFeedProps) {
  const t = useTranslations('churchPrayer')
  const [prayers, setPrayers] = useState<FeedPrayer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchFeed = useCallback(async (pageNum: number, append: boolean, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/church-prayers?feed=true&page=${pageNum}`, signal ? { signal } : undefined)
      if (!res.ok) throw new Error('Failed to fetch')
      if (signal?.aborted) return

      const json = await res.json()
      const newPrayers = json.data as FeedPrayer[]

      if (append) {
        setPrayers(prev => [...prev, ...newPrayers])
      } else {
        setPrayers(newPrayers)
      }
      setHasMore(json.hasMore)
      setPage(pageNum)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      toast.error(t('error.load'))
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setPage(1)
    fetchFeed(1, false, controller.signal)
    return () => controller.abort()
  }, [refreshKey, fetchFeed])

  const handleLoadMore = () => {
    if (loadingMore) return
    setLoadingMore(true)
    fetchFeed(page + 1, true)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (prayers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <HandHeart className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">
          {t('emptyFeedTitle')}
        </h3>
        <p className="text-sm text-zinc-500 max-w-[260px]">
          {t('emptyFeedBody')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {prayers.map(prayer => (
        <PrayerFeedCard key={prayer.id} prayer={prayer} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="h-11"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
