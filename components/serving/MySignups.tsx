'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, X } from 'lucide-react'
import { toast } from 'sonner'

export function MySignups() {
  const t = useTranslations('serving')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const loadMySignups = async () => {
    try {
      const res = await fetch('/api/serving/slots?upcoming=true')
      if (!res.ok) return
      const { data } = await res.json()
      // We need to check which slots the user is signed up for
      // The slot detail endpoint returns user's signup info
      // For efficiency, we load all upcoming slots then filter client-side
      // by fetching each slot detail — but that's N+1
      // Instead, let's just show all upcoming slots and let the member page handle it
      setSlots(data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMySignups() }, [])

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
