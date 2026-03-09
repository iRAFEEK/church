'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ChurchPrayerForm } from '@/components/prayer/ChurchPrayerForm'
import { ChurchPrayerCard } from '@/components/prayer/ChurchPrayerCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HandHeart, Loader2 } from 'lucide-react'

interface MyPrayer {
  id: string
  content: string
  is_anonymous: boolean
  status: string
  resolved_at: string | null
  resolved_notes: string | null
  created_at: string
}

export default function PrayerPage() {
  const t = useTranslations('churchPrayer')
  const [myPrayers, setMyPrayers] = useState<MyPrayer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMyPrayers = async () => {
    try {
      const res = await fetch('/api/church-prayers?mine=true')
      if (res.ok) {
        const json = await res.json()
        setMyPrayers(json.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyPrayers()
  }, [])

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/church-prayers/${id}`, { method: 'DELETE' })
    if (res.ok) fetchMyPrayers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HandHeart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
      </div>

      <ChurchPrayerForm onSubmitted={fetchMyPrayers} />

      {/* User's own prayers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('myPrayers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : myPrayers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('empty')}</p>
          ) : (
            <div className="space-y-3">
              {myPrayers.map(prayer => (
                <div key={prayer.id} className={`p-3 rounded-lg border ${prayer.status === 'answered' ? 'bg-green-50/50 border-green-200' : 'bg-card'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{prayer.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(prayer.created_at).toLocaleDateString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          prayer.status === 'answered'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : prayer.status === 'archived'
                            ? 'bg-gray-50 text-gray-600 border-gray-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {t(`filter${prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1)}`)}
                      </Badge>
                    </div>
                    {prayer.status === 'active' && (
                      <button
                        onClick={() => handleDelete(prayer.id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                  {prayer.resolved_notes && (
                    <div className="mt-2 p-2 rounded bg-green-50 text-xs text-green-800">
                      {prayer.resolved_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
