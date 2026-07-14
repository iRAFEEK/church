'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PrayerSubmitForm } from '@/components/prayer/PrayerSubmitForm'
import { PrayerFeed } from '@/components/prayer/PrayerFeed'
import { MyPrayerRequests } from '@/components/prayer/MyPrayerRequests'
import { HandHeart, Plus, X } from 'lucide-react'

export default function PrayerPage() {
  const t = useTranslations('churchPrayer')
  const [refreshKey, setRefreshKey] = useState(0)
  // The submit form is behind a button (CEO feedback): the page opens on the feed,
  // not on an empty form.
  const [showForm, setShowForm] = useState(false)

  const handleSubmitted = () => {
    setRefreshKey(prev => prev + 1)
    setShowForm(false)
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HandHeart className="h-6 w-6 text-primary" />
        <h1 className="flex-1 text-xl font-semibold text-zinc-900">{t('pageTitle')}</h1>
      </div>

      {/* New request: button first, form on demand */}
      {showForm ? (
        <div className="space-y-2">
          <PrayerSubmitForm onSubmitted={handleSubmitted} />
          <Button variant="ghost" className="w-full h-11" onClick={() => setShowForm(false)}>
            <X className="h-4 w-4 me-2" />
            {t('closeForm')}
          </Button>
        </div>
      ) : (
        <Button className="w-full h-12" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t('newRequest')}
        </Button>
      )}

      {/* Tabs: Church Feed / My Requests */}
      <Tabs defaultValue="feed">
        <TabsList className="w-full">
          <TabsTrigger value="feed" className="flex-1 h-11">
            {t('churchFeed')}
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex-1 h-11">
            {t('myRequests')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          <PrayerFeed refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <MyPrayerRequests refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
