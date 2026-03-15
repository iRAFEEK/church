'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PrayerSubmitForm } from '@/components/prayer/PrayerSubmitForm'
import { PrayerFeed } from '@/components/prayer/PrayerFeed'
import { MyPrayerRequests } from '@/components/prayer/MyPrayerRequests'
import { HandHeart } from 'lucide-react'

export default function PrayerPage() {
  const t = useTranslations('churchPrayer')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSubmitted = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HandHeart className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold text-zinc-900">{t('pageTitle')}</h1>
      </div>

      {/* Submit form */}
      <PrayerSubmitForm onSubmitted={handleSubmitted} />

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
