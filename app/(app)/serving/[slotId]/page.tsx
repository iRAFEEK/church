'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function SlotDetailMemberPage() {
  const { slotId } = useParams<{ slotId: string }>()
  const router = useRouter()
  const t = useTranslations('serving')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [slot, setSlot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSignedUp, setIsSignedUp] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/serving/slots/${slotId}`)
      if (res.ok) {
        const { data } = await res.json()
        setSlot(data)
        setIsSignedUp(data.serving_signups?.some((s: any) => s.status !== 'cancelled') || false)
      }
      setLoading(false)
    })()
  }, [slotId])

  const handleSignup = async () => {
    setActing(true)
    try {
      const res = await fetch(`/api/serving/slots/${slotId}/signup`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      toast.success(t('signedUp'))
      setIsSignedUp(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setActing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm(t('confirmCancel'))) return
    setActing(true)
    try {
      const res = await fetch(`/api/serving/slots/${slotId}/signup`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('signupCancelled'))
      setIsSignedUp(false)
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    )
  }

  if (!slot) {
    return <div className="text-center py-12 text-muted-foreground">{t('noSlots')}</div>
  }

  const title = isAr ? (slot.title_ar || slot.title) : slot.title
  const areaName = slot.serving_areas
    ? (isAr ? (slot.serving_areas.name_ar || slot.serving_areas.name) : slot.serving_areas.name)
    : null
  const notes = isAr ? (slot.notes_ar || slot.notes) : slot.notes
  const activeSignups = slot.serving_signups?.filter((s: any) => s.status !== 'cancelled').length || 0
  const isFull = slot.max_volunteers && activeSignups >= slot.max_volunteers

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        {areaName && <p className="text-sm text-zinc-500 mt-1">{areaName}</p>}
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(slot.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        {slot.start_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {slot.start_time.slice(0, 5)}{slot.end_time ? ` – ${slot.end_time.slice(0, 5)}` : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {activeSignups}{slot.max_volunteers ? `/${slot.max_volunteers}` : ''} {t('volunteers')}
        </span>
        {isFull && <Badge variant="destructive">{t('full')}</Badge>}
      </div>

      {notes && (
        <div className="rounded-lg border p-4 bg-white">
          <p className="whitespace-pre-line text-sm">{notes}</p>
        </div>
      )}

      <div className="pt-4">
        {isSignedUp ? (
          <div className="space-y-3">
            <Badge variant="secondary" className="text-base px-4 py-2">{t('youAreSignedUp')}</Badge>
            <div>
              <Button variant="outline" onClick={handleCancel} disabled={acting}>
                {acting ? t('saving') : t('cancelSignup')}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="lg" onClick={handleSignup} disabled={isFull || acting}>
            {acting ? t('saving') : isFull ? t('full') : t('signUp')}
          </Button>
        )}
      </div>
    </div>
  )
}
