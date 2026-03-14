import { Suspense } from 'react'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Target, Users } from 'lucide-react'
import { FinanceListSkeleton } from '@/components/finance/FinanceSkeleton'

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
  const { profile, resolvedPermissions: perms } = await requirePermission('can_view_finances')
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, name_ar, description, description_ar, goal_amount, raised_amount, pledged_amount, currency, status, start_date, end_date, image_url, is_public, allow_pledges')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (!campaign) notFound()

  const currency = campaign.currency || 'USD'
  const raised = campaign.raised_amount || 0
  const goal = campaign.goal_amount || 0
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0
  const progressColor = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-orange-500'

  return (
    <div className="px-4 py-4 md:px-6 space-y-6 max-w-4xl mx-auto pb-24">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Donors</p>
              <p className="font-semibold">—</p>
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
        <Suspense fallback={<Card><CardHeader className="pb-3"><CardTitle className="text-base">Donations</CardTitle></CardHeader><CardContent><FinanceListSkeleton /></CardContent></Card>}>
          <CampaignDonations campaignId={id} currency={currency} />
        </Suspense>

        <Suspense fallback={<Card><CardHeader className="pb-3"><CardTitle className="text-base">Pledges</CardTitle></CardHeader><CardContent><FinanceListSkeleton /></CardContent></Card>}>
          <CampaignPledges campaignId={id} currency={currency} />
        </Suspense>
      </div>
    </div>
  )
}

async function CampaignDonations({ campaignId, currency }: { campaignId: string; currency: string }) {
  const supabase = await createClient()
  const { data: donations } = await supabase
    .from('donations')
    .select('id, amount, currency, donation_date, is_anonymous, donor:profiles!donor_id(full_name, full_name_ar)')
    .eq('campaign_id', campaignId)
    .order('donation_date', { ascending: false })
    .limit(50)

  interface CampaignDonation {
    id: string; amount: number; currency: string | null; donation_date: string; is_anonymous: boolean
    donor?: { full_name: string | null; full_name_ar: string | null } | null
  }
  const typedDonations = (donations || []) as unknown as CampaignDonation[]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Donations ({typedDonations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-80 overflow-y-auto">
          {typedDonations.map((d) => (
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
          {typedDonations.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No donations yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

async function CampaignPledges({ campaignId, currency }: { campaignId: string; currency: string }) {
  const supabase = await createClient()
  const { data: pledges } = await supabase
    .from('pledges')
    .select('id, total_amount, fulfilled_amount, currency, status, donor:profiles!donor_id(full_name)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  interface CampaignPledge {
    id: string; total_amount: number; fulfilled_amount: number | null; currency: string | null; status: string
    donor?: { full_name: string | null } | null
  }
  const typedPledges = (pledges || []) as unknown as CampaignPledge[]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Pledges ({typedPledges.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-80 overflow-y-auto">
          {typedPledges.map((p) => {
            const fulfilled = p.fulfilled_amount || 0
            const pledgePct = p.total_amount > 0 ? Math.min(100, (fulfilled / p.total_amount) * 100) : 0
            return (
              <div key={p.id} className="px-4 py-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">{p.donor?.full_name || 'Unknown'}</p>
                  <p className="font-mono tabular-nums text-sm">
                    {fmt(fulfilled, currency)} / {fmt(p.total_amount, currency)}
                  </p>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pledgePct}%` }} />
                </div>
              </div>
            )
          })}
          {typedPledges.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No pledges yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
