import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react'
import { OutreachDetailClient } from '@/components/outreach/OutreachDetailClient'
import { redirect } from 'next/navigation'

export default async function OutreachMemberDetailPage({ params }: { params: Promise<{ profileId: string }> }) {
  const user = await requirePermission('can_manage_outreach')
  const t = await getTranslations('outreach')
  const { profileId } = await params
  const supabase = await createClient()
  const churchId = user.profile.church_id

  const [profileResult, visitsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, email, address, address_ar, city, city_ar, photo_url')
      .eq('id', profileId)
      .eq('church_id', churchId)
      .single(),
    supabase
      .from('outreach_visits')
      .select('id, visit_date, notes, needs_followup, followup_date, followup_notes, visited_by, visitor:profiles!outreach_visits_visited_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)')
      .eq('profile_id', profileId)
      .eq('church_id', churchId)
      .order('visit_date', { ascending: false })
      .limit(50),
  ])

  if (!profileResult.data) {
    redirect('/admin/outreach')
  }

  const memberProfile = profileResult.data
  const visits = (visitsResult.data ?? []).map(v => ({
    ...v,
    visitor: Array.isArray(v.visitor) ? v.visitor[0] || null : v.visitor ?? null,
  })) as Array<{
    id: string
    visit_date: string
    notes: string | null
    needs_followup: boolean
    followup_date: string | null
    followup_notes: string | null
    visited_by: string
    visitor: {
      id: string
      first_name: string | null
      last_name: string | null
      first_name_ar: string | null
      last_name_ar: string | null
      photo_url: string | null
    } | null
  }>

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/admin/outreach">
          <Button variant="ghost" className="h-11">
            <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" />
            {t('pageTitle')}
          </Button>
        </Link>
      </div>

      {/* Member Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={memberProfile.photo_url || undefined} />
              <AvatarFallback className="text-lg">
                {`${(memberProfile.first_name || '')[0] || ''}${(memberProfile.last_name || '')[0] || ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold truncate">
                {memberProfile.first_name} {memberProfile.last_name}
              </h2>
              <div className="flex flex-wrap gap-3 mt-1">
                {memberProfile.phone && (
                  <a href={`tel:${memberProfile.phone}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary">
                    <Phone className="h-3.5 w-3.5" /><span dir="ltr">{memberProfile.phone}</span>
                  </a>
                )}
                {memberProfile.email && (
                  <a href={`mailto:${memberProfile.email}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary">
                    <Mail className="h-3.5 w-3.5" /><span dir="ltr">{memberProfile.email}</span>
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
          </div>
        </CardContent>
      </Card>

      {/* Client-side interactive parts: visit history, log visit, assignments */}
      <OutreachDetailClient
        profileId={profileId}
        currentUserId={user.id}
        visits={visits}
      />
    </div>
  )
}
