import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Package } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  needed: 'bg-zinc-100 text-zinc-700',
  requested: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
}

export default async function ResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const t = await getTranslations('conference')
  const locale = await getLocale()
  const isRTL = locale.startsWith('ar')
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  const [{ data: resources }, { data: teams }] = await Promise.all([
    supabase
      .from('conference_resources')
      .select('id, name, name_ar, resource_type, status, quantity_needed, estimated_cost, team_id')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('team_id')
      .order('created_at')
      .limit(500),
    supabase
      .from('conference_teams')
      .select('id, name, name_ar')
      .eq('event_id', id)
      .eq('church_id', user.profile.church_id)
      .order('sort_order')
      .limit(200),
  ])

  // Group resources by team
  const teamMap = new Map((teams || []).map((t) => [t.id, t]))
  const grouped = new Map<string | null, typeof resources>()

  for (const res of (resources || [])) {
    const key = res.team_id
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(res)
  }

  const totalCost = (resources || []).reduce((sum, r) => {
    return sum + (r.estimated_cost || 0)
  }, 0)

  const getResourceName = (res: { name: string; name_ar?: string | null }) =>
    isRTL ? (res.name_ar || res.name) : res.name

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('resources')}</h2>
        <span className="text-sm text-muted-foreground" dir="ltr">{(resources || []).length}</span>
      </div>

      {(!resources || resources.length === 0) && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">{t('emptyResources')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('emptyResourcesDesc')}</p>
          </CardContent>
        </Card>
      )}

      {/* Grouped by team */}
      {[...grouped.entries()].map(([teamId, teamResources]) => {
        const team = teamId ? teamMap.get(teamId) : null
        const teamName = team ? (isRTL ? (team.name_ar || team.name) : team.name) : (isRTL ? 'بدون فريق' : 'No Team')
        const confirmedOrDelivered = (teamResources || []).filter((r) => r.status === 'confirmed' || r.status === 'delivered').length
        const total = (teamResources || []).length

        return (
          <div key={teamId || 'none'} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">{teamName}</h3>
              <span className="text-xs text-muted-foreground" dir="ltr">{confirmedOrDelivered}/{total}</span>
            </div>
            {(teamResources || []).map((res) => (
              <div key={res.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getResourceName(res)}</p>
                  <p className="text-xs text-muted-foreground">{t(res.resource_type as Parameters<typeof t>[0])}</p>
                </div>
                {res.quantity_needed && (
                  <span className="text-sm text-muted-foreground" dir="ltr">×{res.quantity_needed}</span>
                )}
                <Badge className={`text-xs shrink-0 ${STATUS_COLORS[res.status] || ''}`}>
                  {t(`resource${res.status.charAt(0).toUpperCase()}${res.status.slice(1)}` as Parameters<typeof t>[0])}
                </Badge>
                {res.estimated_cost != null && res.estimated_cost > 0 && (
                  <span className="text-sm font-medium shrink-0" dir="ltr">{res.estimated_cost}</span>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Total cost */}
      {totalCost > 0 && (
        <div className="rounded-xl border p-4 flex items-center justify-between bg-muted/30">
          <span className="text-sm font-medium">{t('totalCost')}</span>
          <span className="text-lg font-bold" dir="ltr">{totalCost.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
