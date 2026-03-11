import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Target, Users } from 'lucide-react'

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

const STATUS_COLOR: Record<string, string> = {
  planning:  'bg-gray-100 text-gray-700',
  active:    'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_finances) redirect('/admin')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (!campaign) notFound()

  const { data: donations } = await supabase
    .from('donations')
    .select('*, donor:profiles!donor_id(full_name, full_name_ar)')
    .eq('campaign_id', id)
    .order('donation_date', { ascending: false })
    .limit(50)

  const { data: pledges } = await supabase
    .from('pledges')
    .select('*, pledger:profiles!pledger_id(full_name)')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })

  const currency = campaign.currency || 'USD'
  const raised = campaign.raised_amount || 0
  const goal = campaign.goal_amount || 0
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0
  const progressColor = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-orange-500'

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/finance/campaigns"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{campaign.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[campaign.status] || ''}`}>
                {campaign.status}
              </span>
            </div>
            {campaign.name_ar && <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">{campaign.name_ar}</p>}
            {campaign.description && <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>}
          </div>
        </div>
        {perms.can_manage_campaigns && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/finance/campaigns/${id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{fmt(raised, currency)}</p>
              <p className="text-sm text-muted-foreground">raised of {fmt(goal, currency)} goal</p>
            </div>
            <div className="text-end">
              <p className="text-2xl font-bold">{pct.toFixed(0)}%</p>
              {campaign.pledged_amount > 0 && (
                <p className="text-sm text-muted-foreground">{fmt(campaign.pledged_amount, currency)} pledged</p>
              )}
            </div>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Donors</p>
              <p className="font-semibold">{donations?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Start</p>
              <p className="font-semibold">{campaign.start_date}</p>
            </div>
            <div>
              <p className="text-muted-foreground">End</p>
              <p className="font-semibold">{campaign.end_date || 'Open-ended'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Donations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Donations ({donations?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {(donations || []).map(d => (
                <div key={d.id} className="px-4 py-2.5 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {d.is_anonymous ? 'Anonymous' : (d.donor?.full_name || 'Unknown')}
                    </p>
                    <p className="text-xs text-muted-foreground">{d.donation_date}</p>
                  </div>
                  <p className="font-mono tabular-nums text-sm font-semibold">
                    {fmt(d.amount, d.currency || currency)}
                  </p>
                </div>
              ))}
              {(!donations || donations.length === 0) && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">No donations yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pledges */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Pledges ({pledges?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {(pledges || []).map(p => {
                const fulfilled = p.fulfilled_amount || 0
                const pledgePct = p.pledge_amount > 0 ? Math.min(100, (fulfilled / p.pledge_amount) * 100) : 0
                return (
                  <div key={p.id} className="px-4 py-2.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{p.pledger?.full_name || 'Unknown'}</p>
                      <p className="font-mono tabular-nums text-sm">
                        {fmt(fulfilled, currency)} / {fmt(p.pledge_amount, currency)}
                      </p>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pledgePct}%` }} />
                    </div>
                  </div>
                )
              })}
              {(!pledges || pledges.length === 0) && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">No pledges yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
