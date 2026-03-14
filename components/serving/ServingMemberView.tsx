'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Calendar, Clock, Users, X, HandHelping } from 'lucide-react'
import { toast } from 'sonner'

function ServingShimmer() {
  return (
    <div className="space-y-6">
      {[1, 2].map(i => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="divide-y rounded-lg border">
            {[1, 2, 3].map(j => (
              <div key={j} className="flex items-center justify-between p-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-4">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ServingMemberView() {
  const t = useTranslations('serving')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  interface MemberSlot {
    id: string
    title: string
    title_ar: string | null
    date: string
    start_time: string | null
    end_time: string | null
    max_volunteers: number | null
    signup_count: number
    serving_area_id: string
  }
  interface MemberArea {
    id: string
    name: string
    name_ar: string | null
  }
  const [slots, setSlots] = useState<MemberSlot[]>([])
  const [areas, setAreas] = useState<MemberArea[]>([])
  const [mySignups, setMySignups] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [signingUp, setSigningUp] = useState<string | null>(null)

  const loadData = async (signal?: AbortSignal) => {
    try {
      const [slotsRes, areasRes] = await Promise.all([
        fetch('/api/serving/slots?upcoming=true', { signal }),
        fetch('/api/serving/areas', { signal }),
      ])
      const slotsData = await slotsRes.json()
      const areasData = await areasRes.json()

      if (signal?.aborted) return

      setSlots(slotsData.data || [])
      setAreas(areasData.data || [])

      const signupMap: Record<string, boolean> = {}
      const detailPromises = (slotsData.data || []).map(async (slot: MemberSlot) => {
        const res = await fetch(`/api/serving/slots/${slot.id}`, { signal })
        const detail = await res.json()
        if (detail.data?.serving_signups?.some((s: { status: string }) => s.status !== 'cancelled')) {
          signupMap[slot.id] = true
        }
      })
      await Promise.all(detailPromises)
      if (!signal?.aborted) {
        setMySignups(signupMap)
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        // ignore
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [])

  const handleSignup = async (slotId: string) => {
    setSigningUp(slotId)
    try {
      const res = await fetch(`/api/serving/slots/${slotId}/signup`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      toast.success(t('signupSuccess'))
      setMySignups(prev => ({ ...prev, [slotId]: true }))
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, signup_count: (s.signup_count || 0) + 1 } : s))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setSigningUp(null)
    }
  }

  const handleCancel = async (slotId: string) => {
    setSigningUp(slotId)
    try {
      const res = await fetch(`/api/serving/slots/${slotId}/signup`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('signupCancelled'))
      setMySignups(prev => ({ ...prev, [slotId]: false }))
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, signup_count: Math.max(0, (s.signup_count || 0) - 1) } : s))
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setSigningUp(null)
    }
  }

  // Group slots by area
  const slotsByArea: Record<string, MemberSlot[]> = {}
  for (const slot of slots) {
    const areaId = slot.serving_area_id
    if (!slotsByArea[areaId]) slotsByArea[areaId] = []
    slotsByArea[areaId].push(slot)
  }

  if (loading) return <ServingShimmer />

  if (Object.keys(slotsByArea).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <HandHelping className="h-8 w-8 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">{t('noOpenSlots')}</h3>
        <p className="text-sm text-zinc-500 max-w-[260px]">{t('noOpenSlotsBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(slotsByArea).map(([areaId, areaSlots]) => {
        const area = areas.find((a) => a.id === areaId)
        const areaName = area
          ? (isAr ? (area.name_ar || area.name) : area.name)
          : ''

        return (
          <div key={areaId} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-semibold">{areaName}</h2>
            <div className="divide-y rounded-lg border">
              {areaSlots.map((slot) => {
                const title = isAr ? (slot.title_ar || slot.title) : slot.title
                const isFull = slot.max_volunteers && slot.signup_count >= slot.max_volunteers
                const isSignedUp = mySignups[slot.id]

                return (
                  <div key={slot.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
                    <div>
                      <p className="font-medium">{title}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(slot.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </span>
                        {slot.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {slot.start_time.slice(0, 5)}{slot.end_time ? ` – ${slot.end_time.slice(0, 5)}` : ''}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {slot.signup_count}{slot.max_volunteers ? `/${slot.max_volunteers}` : ''}
                        </span>
                      </div>
                    </div>
                    <div>
                      {isSignedUp ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={signingUp === slot.id}
                              className="transition-all"
                            >
                              <X className="h-4 w-4 me-1" />
                              {signingUp === slot.id ? t('cancelling') : t('cancelSignup')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('confirmCancelTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('confirmCancel')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('keepSignup')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(slot.id)} className="bg-red-600 hover:bg-red-700">
                                {t('cancelSignup')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSignup(slot.id)}
                          disabled={isFull || signingUp === slot.id}
                          className="transition-all"
                        >
                          {signingUp === slot.id ? t('signingUp') : isFull ? t('slotFull') : t('signUp')}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
