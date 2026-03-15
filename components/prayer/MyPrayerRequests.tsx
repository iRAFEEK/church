'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { HandHeart, Heart, Check, Trash2, Loader2, Lock, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

type MyPrayer = {
  id: string
  content: string
  is_anonymous: boolean
  is_private: boolean
  status: string
  resolved_at: string | null
  resolved_notes: string | null
  created_at: string
  prayer_count: number
  is_praying: boolean
}

type MyPrayerRequestsProps = {
  refreshKey: number
}

export function MyPrayerRequests({ refreshKey }: MyPrayerRequestsProps) {
  const t = useTranslations('churchPrayer')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [prayers, setPrayers] = useState<MyPrayer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const fetchMine = useCallback(async (pageNum: number, append: boolean, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/church-prayers?mine=true&page=${pageNum}`, signal ? { signal } : undefined)
      if (!res.ok) throw new Error('Failed to fetch')
      if (signal?.aborted) return

      const json = await res.json()
      const newPrayers = json.data as MyPrayer[]

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
    fetchMine(1, false, controller.signal)
    return () => controller.abort()
  }, [refreshKey, fetchMine])

  const handleLoadMore = () => {
    if (loadingMore) return
    setLoadingMore(true)
    fetchMine(page + 1, true)
  }

  const handleMarkAnswered = async (id: string) => {
    if (markingId) return
    setMarkingId(id)
    try {
      const res = await fetch(`/api/church-prayers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'answered' }),
      })
      if (res.ok) {
        setPrayers(prev =>
          prev.map(p =>
            p.id === id
              ? { ...p, status: 'answered', resolved_at: new Date().toISOString() }
              : p
          )
        )
        toast.success(t('markedAsAnswered'))
      } else {
        toast.error(t('error.update'))
      }
    } catch {
      toast.error(t('error.update'))
    } finally {
      setMarkingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/church-prayers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPrayers(prev => prev.filter(p => p.id !== id))
        toast.success(t('deleted'))
      } else {
        toast.error(t('error.delete'))
      }
    } catch {
      toast.error(t('error.delete'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
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
          {t('emptyTitle')}
        </h3>
        <p className="text-sm text-zinc-500 max-w-[260px]">
          {t('emptyBody')}
        </p>
      </div>
    )
  }

  const statusStyles: Record<string, string> = {
    active: 'bg-blue-50 text-blue-700 border-blue-200',
    answered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  return (
    <div className="space-y-3">
      {prayers.map(prayer => (
        <Card
          key={prayer.id}
          className={`border-zinc-100 shadow-sm ${
            prayer.status === 'answered' ? 'bg-emerald-50/30 border-emerald-200' : ''
          }`}
        >
          <CardContent className="pt-4 pb-3 px-4">
            {/* Content */}
            <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap mb-3">
              {prayer.content}
            </p>

            {/* Meta row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500">
                  {new Date(prayer.created_at).toLocaleDateString(
                    isAr ? 'ar-EG' : 'en-US',
                    { month: 'short', day: 'numeric' }
                  )}
                </span>

                <Badge
                  variant="outline"
                  className={`text-xs ${statusStyles[prayer.status] ?? statusStyles.active}`}
                >
                  {t(`filter${prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1)}`)}
                </Badge>

                {prayer.is_private && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Lock className="h-3 w-3" />
                    {t('visibilityPrivate')}
                  </span>
                )}

                {prayer.is_anonymous && !prayer.is_private && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <EyeOff className="h-3 w-3" />
                    {t('visibilityAnonymous')}
                  </span>
                )}

                {prayer.prayer_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                    {t('prayingCount', { count: prayer.prayer_count })}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {prayer.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleMarkAnswered(prayer.id)}
                    disabled={markingId === prayer.id}
                  >
                    {markingId === prayer.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5 me-1" />
                    )}
                    <span className="text-xs">{t('markAnswered')}</span>
                  </Button>
                )}

                {prayer.status === 'active' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('deleteConfirmBody')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('deleteConfirmCancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(prayer.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* Resolved notes */}
            {prayer.resolved_notes && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 text-xs text-emerald-800">
                {prayer.resolved_notes}
              </div>
            )}
          </CardContent>
        </Card>
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
