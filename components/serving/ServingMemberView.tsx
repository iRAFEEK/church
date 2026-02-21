'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, Users, X } from 'lucide-react'
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
  const isAr = locale === 'ar'

  const [slots, setSlots] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [mySignups, setMySignups] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [signingUp, setSigningUp] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [slotsRes, areasRes] = await Promise.all([
        fetch('/api/serving/slots?upcoming=true'),
        fetch('/api/serving/areas'),
      ])
      const slotsData = await slotsRes.json()
      const areasData = await areasRes.json()

      setSlots(slotsData.data || [])
      setAreas(areasData.data || [])

      const signupMap: Record<string, boolean> = {}
      const detailPromises = (slotsData.data || []).map(async (slot: any) => {
        const res = await fetch(`/api/serving/slots/${slot.id}`)
        const detail = await res.json()
        if (detail.data?.serving_signups?.some((s: any) => s.status !== 'cancelled')) {
          signupMap[slot.id] = true
        }
      })
      await Promise.all(detailPromises)
      setMySignups(signupMap)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

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
    if (!confirm(t('confirmDelete'))) return
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
  const slotsByArea: Record<string, any[]> = {}
  for (const slot of slots) {
    const areaId = slot.serving_area_id
    if (!slotsByArea[areaId]) slotsByArea[areaId] = []
    slotsByArea[areaId].push(slot)
  }

  if (loading) return <ServingShimmer />

  if (Object.keys(slotsByArea).length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t('noOpenSlots')}</div>
  }

  return (
    <div className="space-y-6">
      {Object.entries(slotsByArea).map(([areaId, areaSlots]) => {
        const area = areas.find((a: any) => a.id === areaId)
        const areaName = area
          ? (isAr ? (area.name_ar || area.name) : area.name)
          : ''

        return (
          <div key={areaId} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-semibold">{areaName}</h2>
            <div className="divide-y rounded-lg border">
              {areaSlots.map((slot: any) => {
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(slot.id)}
                          disabled={signingUp === slot.id}
                          className="transition-all"
                        >
                          <X className="h-4 w-4 me-1" />
                          {signingUp === slot.id ? t('cancelling') : t('cancelSignup')}
                        </Button>
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
