'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, X } from 'lucide-react'
import { toast } from 'sonner'

interface SignupSlot {
  id: string
  title: string | null
  title_ar: string | null
  date: string
  serving_areas?: { name: string | null; name_ar: string | null } | null
}

export function MySignups() {
  const t = useTranslations('serving')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [slots, setSlots] = useState<SignupSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const controllerRef = { current: null as AbortController | null }

  const loadMySignups = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/serving/slots?upcoming=true', { signal })
      if (!res.ok) return
      const { data } = await res.json()
      if (!signal?.aborted) {
        setSlots(data || [])
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
    controllerRef.current = controller
    loadMySignups(controller.signal)
    return () => controller.abort()
  }, [])

  const handleCancel = async (slotId: string) => {
    if (!confirm(t('confirmCancel'))) return
    setCancelling(slotId)
    try {
      const res = await fetch(`/api/serving/slots/${slotId}/signup`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('signupCancelled'))
      loadMySignups()
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setCancelling(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
  }

  // This component is used on the member serving page
  // We'll show it as a section — actual filtering by user signups happens on the page
  return null
}
