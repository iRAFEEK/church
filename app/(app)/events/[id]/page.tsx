'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Event {
  id: string
  title: string
  title_ar: string
  description: string | null
  description_ar: string | null
  event_type: string
  starts_at: string
  ends_at: string | null
  location: string | null
  capacity: number | null
  is_public: boolean
  registration_required: boolean
  status: string
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [event, setEvent] = useState<Event | null>(null)
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/events/${id}`)
        if (!res.ok) return
        const json = await res.json()
        setEvent(json.data)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const res = await fetch(`/api/events/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.status === 409) {
        setRegistered(true)
        toast.info(t('alreadyRegistered'))
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      setRegistered(true)
      toast.success(t('registeredSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
  }

  if (!event) {
    return <div className="text-center py-12 text-muted-foreground">{t('eventNotFound')}</div>
  }

  const title = isRTL ? (event.title_ar || event.title) : event.title
  const description = isRTL ? (event.description_ar || event.description) : event.description

  const startDate = new Date(event.starts_at)
  const dateStr = startDate.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = startDate.toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{t(`type_${event.event_type}`)}</Badge>
        </div>
      </div>

      <div className="border rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {dateStr}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {timeStr}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}
          {event.capacity && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {t('capacityLabel')}: {event.capacity}
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm leading-relaxed">{description}</p>
        )}
      </div>

      {event.registration_required && (
        <div className="flex justify-center">
          {registered ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 px-4 py-2 text-sm">
              {t('youAreRegistered')}
            </Badge>
          ) : (
            <Button size="lg" onClick={handleRegister} disabled={registering}>
              {registering ? t('registering') : t('registerForEvent')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
