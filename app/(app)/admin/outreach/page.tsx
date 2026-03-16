import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { MapPin } from 'lucide-react'
import { OutreachMemberList } from '@/components/outreach/OutreachMemberList'

export default async function OutreachPage() {
  const user = await requirePermission('can_manage_outreach')
  const t = await getTranslations('outreach')
  const supabase = await createClient()
  const churchId = user.profile.church_id

  // Fetch first page of members + stats in parallel
  const [membersResult, visitsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, address, address_ar, city, city_ar, photo_url, status')
      .eq('church_id', churchId)
      .eq('status', 'active')
      .order('first_name'),
    supabase
      .from('outreach_visits')
      .select('profile_id, visit_date, needs_followup')
      .eq('church_id', churchId)
      .order('visit_date', { ascending: false }),
  ])

  const members = membersResult.data ?? []
  const visits = visitsResult.data ?? []

  // Build visit summary map
  const visitMap = new Map<string, { lastDate: string; needsFollowup: boolean; totalVisits: number }>()
  for (const v of visits as Array<{ profile_id: string; visit_date: string; needs_followup: boolean }>) {
    const existing = visitMap.get(v.profile_id)
    if (!existing) {
      visitMap.set(v.profile_id, { lastDate: v.visit_date, needsFollowup: v.needs_followup, totalVisits: 1 })
    } else {
      existing.totalVisits++
    }
  }

  const memberSummaries = members.map(m => ({
    profile_id: m.id,
    first_name: m.first_name,
    last_name: m.last_name,
    first_name_ar: m.first_name_ar,
    last_name_ar: m.last_name_ar,
    phone: m.phone,
    address: m.address,
    address_ar: m.address_ar,
    city: m.city,
    city_ar: m.city_ar,
    photo_url: m.photo_url,
    last_visit_date: visitMap.get(m.id)?.lastDate || null,
    needs_followup: visitMap.get(m.id)?.needsFollowup || false,
    total_visits: visitMap.get(m.id)?.totalVisits || 0,
  }))

  // Compute stats
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoffStr = thirtyDaysAgo.toISOString().split('T')[0]

  const stats = {
    total: memberSummaries.length,
    needsVisit: memberSummaries.filter(r => !r.last_visit_date || r.last_visit_date < cutoffStr).length,
    needsFollowup: memberSummaries.filter(r => r.needs_followup).length,
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <OutreachMemberList
        initialMembers={memberSummaries}
        stats={stats}
      />
    </div>
  )
}
