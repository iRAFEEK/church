'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogVisitDialog } from '@/components/outreach/LogVisitDialog'
import { VisitHistoryList } from '@/components/outreach/VisitHistoryList'
import { ArrowLeft, MapPin, Phone, Loader2, Mail } from 'lucide-react'

interface MemberProfile {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  phone: string | null
  address: string | null
  city: string | null
  photo_url: string | null
}

interface Visit {
  id: string
  visit_date: string
  notes: string | null
  needs_followup: boolean
  followup_date: string | null
  followup_notes: string | null
  visitor?: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
  } | null
}

export default function OutreachMemberDetailPage() {
  const t = useTranslations('outreach')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const params = useParams()
  const profileId = params.profileId as string

  const [visits, setVisits] = useState<Visit[]>([])
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/outreach/visits?profile_id=${profileId}`)
      if (res.ok) {
        const json = await res.json()
        const data = json.data || []
        setVisits(data)
        // Extract profile from first visit
        if (data.length > 0 && data[0].profile) {
          setMemberProfile(data[0].profile)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    fetchVisits()
  }, [fetchVisits])

  const handleDeleteVisit = async (id: string) => {
    const res = await fetch(`/api/outreach/visits/${id}`, { method: 'DELETE' })
    if (res.ok) fetchVisits()
  }

  const name = memberProfile
    ? isAr
      ? `${memberProfile.first_name_ar || memberProfile.first_name || ''} ${memberProfile.last_name_ar || memberProfile.last_name || ''}`.trim()
      : `${memberProfile.first_name || ''} ${memberProfile.last_name || ''}`.trim()
    : ''

  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/outreach">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 me-1" />
            {t('pageTitle')}
          </Button>
        </Link>
      </div>

      {loading && !memberProfile ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Member Info Card */}
          {memberProfile && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={memberProfile.photo_url || undefined} />
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{name}</h2>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {memberProfile.phone && (
                        <a href={`tel:${memberProfile.phone}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3.5 w-3.5" />{memberProfile.phone}
                        </a>
                      )}
                      {memberProfile.city && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />{memberProfile.city}
                        </span>
                      )}
                    </div>
                    {memberProfile.address && (
                      <p className="text-sm text-muted-foreground mt-1">{memberProfile.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Badge variant="secondary">{t('totalVisits')}: {visits.length}</Badge>
                  <LogVisitDialog profileId={profileId} onSaved={fetchVisits} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visit History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('visitHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <VisitHistoryList visits={visits} onDelete={handleDeleteVisit} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
