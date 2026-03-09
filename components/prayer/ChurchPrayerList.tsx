'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChurchPrayerCard } from './ChurchPrayerCard'
import { Loader2 } from 'lucide-react'

interface Submitter {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

interface Prayer {
  id: string
  content: string
  is_anonymous: boolean
  status: string
  resolved_at: string | null
  resolved_notes: string | null
  created_at: string
  submitter: Submitter | null
}

export function ChurchPrayerList() {
  const t = useTranslations('churchPrayer')
  const [tab, setTab] = useState('active')
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPrayers = useCallback(async (status: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/church-prayers?status=${status}`)
      if (res.ok) {
        const json = await res.json()
        setPrayers(json.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrayers(tab)
  }, [tab, fetchPrayers])

  const handleMarkAnswered = async (id: string) => {
    const res = await fetch(`/api/church-prayers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'answered' }),
    })
    if (res.ok) fetchPrayers(tab)
  }

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/church-prayers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (res.ok) fetchPrayers(tab)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/church-prayers/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) fetchPrayers(tab)
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="active">{t('filterActive')}</TabsTrigger>
        <TabsTrigger value="answered">{t('filterAnswered')}</TabsTrigger>
        <TabsTrigger value="archived">{t('filterArchived')}</TabsTrigger>
      </TabsList>

      <TabsContent value={tab} className="mt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : prayers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{t('empty')}</p>
        ) : (
          <div className="space-y-3">
            {prayers.map(prayer => (
              <ChurchPrayerCard
                key={prayer.id}
                prayer={prayer}
                onMarkAnswered={tab === 'active' ? handleMarkAnswered : undefined}
                onArchive={tab === 'active' ? handleArchive : undefined}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
