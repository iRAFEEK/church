'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChurchPrayerCard, type Prayer } from './ChurchPrayerCard'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function VirtualPrayerList({
  prayers, tab, onMarkAnswered, onArchive, onDelete, onAssigned, onUnassign,
}: {
  prayers: Prayer[]
  tab: string
  onMarkAnswered: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onAssigned: () => void
  onUnassign: (id: string) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: prayers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 3,
  })

  return (
    <div ref={parentRef} className="overflow-auto max-h-[70vh]">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const prayer = prayers[virtualRow.index]
          return (
            <div
              key={prayer.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute w-full pb-3"
              style={{ top: `${virtualRow.start}px` }}
            >
              <ChurchPrayerCard
                prayer={prayer}
                onMarkAnswered={tab === 'active' ? onMarkAnswered : undefined}
                onArchive={tab === 'active' ? onArchive : undefined}
                onDelete={onDelete}
                onAssigned={onAssigned}
                onUnassign={onUnassign}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
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
    const prev = prayers
    setPrayers(p => p.filter(x => x.id !== id))
    const res = await fetch(`/api/church-prayers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'answered' }),
    })
    if (!res.ok) { setPrayers(prev); toast.error(t('error')) }
  }

  const handleArchive = async (id: string) => {
    const prev = prayers
    setPrayers(p => p.filter(x => x.id !== id))
    const res = await fetch(`/api/church-prayers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (!res.ok) { setPrayers(prev); toast.error(t('error')) }
  }

  const handleDelete = async (id: string) => {
    const prev = prayers
    setPrayers(p => p.filter(x => x.id !== id))
    const res = await fetch(`/api/church-prayers/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) { setPrayers(prev); toast.error(t('error')) }
  }

  const handleUnassign = async (id: string) => {
    const prev = prayers
    setPrayers(p => p.map(x => x.id === id ? { ...x, assigned_to: null, assigned_name: undefined } : x))
    const res = await fetch(`/api/church-prayers/${id}/assign`, {
      method: 'DELETE',
    })
    if (res.ok) {
      toast.success(t('unassignSuccess'))
    } else {
      setPrayers(prev); toast.error(t('error'))
    }
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
          <VirtualPrayerList
            prayers={prayers}
            tab={tab}
            onMarkAnswered={handleMarkAnswered}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onAssigned={() => fetchPrayers(tab)}
            onUnassign={handleUnassign}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}
