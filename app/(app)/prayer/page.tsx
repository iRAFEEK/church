'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChurchPrayerForm } from '@/components/prayer/ChurchPrayerForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HandHeart, UserCheck, Loader2, EyeOff } from 'lucide-react'

interface MyPrayer {
  id: string
  content: string
  is_anonymous: boolean
  status: string
  resolved_at: string | null
  resolved_notes: string | null
  created_at: string
}

interface Submitter {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
}

interface AssignedPrayer {
  id: string
  content: string
  is_anonymous: boolean
  status: string
  resolved_at: string | null
  resolved_notes: string | null
  created_at: string
  submitter: Submitter | null
}

export default function PrayerPage() {
  const t = useTranslations('churchPrayer')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [myPrayers, setMyPrayers] = useState<MyPrayer[]>([])
  const [assignedPrayers, setAssignedPrayers] = useState<AssignedPrayer[]>([])
  const [loadingMine, setLoadingMine] = useState(true)
  const [loadingAssigned, setLoadingAssigned] = useState(true)

  const fetchMyPrayers = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/church-prayers?mine=true', signal ? { signal } : undefined)
      if (res.ok && !(signal?.aborted)) {
        const json = await res.json()
        setMyPrayers(json.data || [])
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[PrayerPage] Failed to fetch my prayers:', e)
      }
    } finally {
      if (!(signal?.aborted)) setLoadingMine(false)
    }
  }

  const fetchAssignedPrayers = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/church-prayers?assigned=true', signal ? { signal } : undefined)
      if (res.ok && !(signal?.aborted)) {
        const json = await res.json()
        setAssignedPrayers(json.data || [])
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[PrayerPage] Failed to fetch assigned prayers:', e)
      }
    } finally {
      if (!(signal?.aborted)) setLoadingAssigned(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchMyPrayers(controller.signal)
    fetchAssignedPrayers(controller.signal)
    return () => controller.abort()
  }, [])

  function getSubmitterName(s: Submitter) {
    if (isAr) {
      const ar = `${s.first_name_ar || ''} ${s.last_name_ar || ''}`.trim()
      if (ar) return ar
    }
    return `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—'
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

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

      {/* Prayers assigned to me */}
      {!loadingAssigned && assignedPrayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              {t('assignedToMe')}
              <Badge variant="secondary" className="text-[10px] ms-1">{assignedPrayers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignedPrayers.map(prayer => {
                const submitterName = prayer.submitter ? getSubmitterName(prayer.submitter) : null
                const initials = submitterName ? getInitials(submitterName) : '?'

                return (
                  <div key={prayer.id} className={`p-4 rounded-lg border ${prayer.status === 'answered' ? 'bg-green-50/50 border-green-200' : 'bg-blue-50/30 border-blue-200'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{prayer.content}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {prayer.is_anonymous || !prayer.submitter ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <EyeOff className="h-3.5 w-3.5" />
                          <span className="text-xs">{t('anonymous')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={prayer.submitter.photo_url || undefined} />
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{submitterName}</span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        · {new Date(prayer.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          prayer.status === 'answered'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {prayer.status === 'answered' ? t('filterAnswered') : t('filterActive')}
                      </Badge>
                    </div>
                    {prayer.resolved_notes && (
                      <div className="mt-2 p-2 rounded bg-green-50 text-xs text-green-800">
                        {prayer.resolved_notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingAssigned && (
        <Card>
          <CardContent className="py-6">
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's own prayers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('myPrayers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMine ? (
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
                        {new Date(prayer.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
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
