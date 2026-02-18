'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Registration {
  id: string
  name: string
  phone: string | null
  email: string | null
  status: string
  registered_at: string
  check_in_at: string | null
}

interface EventRegistrationsProps {
  eventId: string
}

export function EventRegistrations({ eventId }: EventRegistrationsProps) {
  const t = useTranslations('events')
  const locale = useLocale()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchRegistrations = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`)
      if (!res.ok) return
      const json = await res.json()
      setRegistrations(json.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
  }, [eventId])

  const handleAction = async (registrationId: string, action: 'check_in' | 'cancel') => {
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, action }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(action === 'check_in' ? t('checkedIn') : t('cancelled'))
      fetchRegistrations()
    } catch {
      toast.error(t('errorGeneral'))
    }
  }

  const filtered = registrations.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: registrations.length,
    checkedIn: registrations.filter(r => r.status === 'checked_in').length,
    registered: registrations.filter(r => r.status === 'registered').length,
  }

  const statusColors: Record<string, string> = {
    registered: 'bg-blue-100 text-blue-800',
    checked_in: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">{t('loading')}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="font-medium">{t('totalRegistrations')}: {stats.total}</span>
        <span className="text-green-600">{t('checkedInCount')}: {stats.checkedIn}</span>
        <span className="text-blue-600">{t('pendingCount')}: {stats.registered}</span>
      </div>

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchRegistrations')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t('noRegistrations')}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filtered.map(reg => (
            <div key={reg.id} className="flex items-center justify-between p-3 gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{reg.name}</p>
                <p className="text-xs text-muted-foreground">
                  {reg.phone || reg.email || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={statusColors[reg.status] || ''}>
                  {t(`regStatus_${reg.status}`)}
                </Badge>
                {reg.status === 'registered' && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-green-600"
                      onClick={() => handleAction(reg.id, 'check_in')}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-red-600"
                      onClick={() => handleAction(reg.id, 'cancel')}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
