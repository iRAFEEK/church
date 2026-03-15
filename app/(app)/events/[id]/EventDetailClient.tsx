'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { EventRunOfShow } from '@/components/events/EventRunOfShow'

type EventData = {
  id: string
  title: string
  title_ar: string | null
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

type EventDetailClientProps = {
  event: EventData
  eventId: string
  isRegistered: boolean
  registrationCount: number
}

export function EventDetailClient({ event, eventId, isRegistered: initialRegistered, registrationCount }: EventDetailClientProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const [registered, setRegistered] = useState(initialRegistered)
  const [registering, setRegistering] = useState(false)
  const isFull = event.capacity != null && registrationCount >= event.capacity

  const handleRegister = async () => {
    if (registering) return
    setRegistering(true)
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
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
        throw new Error('Failed')
      }

      setRegistered(true)
      toast.success(t('registeredSuccess'))
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setRegistering(false)
    }
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
          {isFull && (
            <Badge variant="destructive">{t('eventFull')}</Badge>
          )}
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
          {event.capacity != null && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span dir="ltr">{registrationCount}/{event.capacity}</span>
              {t('registered')}
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm leading-relaxed">{description}</p>
        )}
      </div>

      <EventRunOfShow eventId={eventId} />

      {event.registration_required && (
        <div className="flex flex-col items-center gap-2">
          {registered ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 px-4 py-2 text-sm">
              {t('youAreRegistered')}
            </Badge>
          ) : isFull ? (
            <Badge variant="destructive" className="px-4 py-2 text-sm">
              {t('registrationClosed')}
            </Badge>
          ) : (
            <>
              <Button size="lg" onClick={handleRegister} disabled={registering} className="h-11">
                {registering ? t('registering') : t('registerForEvent')}
              </Button>
              {event.capacity != null && (
                <p className="text-xs text-muted-foreground">
                  {t('spotsRemaining', { count: String(event.capacity - registrationCount) })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
