import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Target, Calendar } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import type { Campaign } from '@/types'

interface SearchParams { status?: string }

const STATUS_CONFIG: Record<string, { en: string; ar: string; class: string }> = {
  planning:  { en: 'Planning',   ar: 'تخطيط',  class: 'bg-gray-100 text-gray-700' },
  active:    { en: 'Active',     ar: 'نشط',    class: 'bg-green-100 text-green-800' },
  paused:    { en: 'Paused',     ar: 'موقوف',  class: 'bg-yellow-100 text-yellow-800' },
  completed: { en: 'Completed',  ar: 'مكتمل',  class: 'bg-blue-100 text-blue-800' },
  cancelled: { en: 'Cancelled',  ar: 'ملغي',   class: 'bg-red-100 text-red-800' },
}

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requirePermission('can_manage_campaigns')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale === 'ar'
  const params = await searchParams

  let query = supabase
    .from('campaigns')
    .select('*, fund:fund_id(id, name, name_ar)', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('start_date', { ascending: false })

  if (params.status) query = query.eq('status', params.status)

  const { data: campaigns, count } = await query

  const activeCampaigns = (campaigns || []).filter((c: Campaign) => c.status === 'active')
  const totalRaised = activeCampaigns.reduce((s: number, c: Campaign) => s + c.raised_amount, 0)
  const totalGoal = activeCampaigns.reduce((s: number, c: Campaign) => s + c.goal_amount, 0)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'الحملات' : 'Campaigns'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {count} {isAr ? 'حملة' : 'campaigns'}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/finance/campaigns/new">
            <Plus className="w-4 h-4 me-2" />
            {isAr ? 'حملة جديدة' : 'New Campaign'}
          </Link>
        </Button>
      </div>

      {/* Summary */}
      {activeCampaigns.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي مجموع الحملات النشطة' : 'Combined Active Campaign Progress'}</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatCurrency(totalRaised, 'USD', locale)} / {formatCurrency(totalGoal, 'USD', locale)}
                </p>
              </div>
              <span className="text-xl font-bold">
                {totalGoal > 0 ? ((totalRaised / totalGoal) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${totalGoal > 0 ? Math.min(100, (totalRaised / totalGoal) * 100) : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={!params.status ? 'default' : 'outline'} size="sm" asChild>
          <Link href="/admin/finance/campaigns">{isAr ? 'الكل' : 'All'}</Link>
        </Button>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <Button key={k} variant={params.status === k ? 'default' : 'outline'} size="sm" asChild>
            <Link href={`?status=${k}`}>{isAr ? v.ar : v.en}</Link>
          </Button>
        ))}
      </div>

      {/* Campaign cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(campaigns as Campaign[] || []).map((c) => {
          const pct = c.goal_amount > 0 ? Math.min(100, (c.raised_amount / c.goal_amount) * 100) : 0
          const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.planning

          return (
            <Card key={c.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {c.image_url && (
                <div className="h-32 overflow-hidden bg-muted">
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{isAr ? c.name_ar || c.name : c.name}</CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${sc.class}`}>
                    {isAr ? sc.ar : sc.en}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {isAr ? c.description_ar || c.description : c.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Thermometer */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-bold text-green-700">{formatCurrency(c.raised_amount, c.currency, locale)}</span>
                    <span className="text-muted-foreground text-xs">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 100 ? '#22c55e' : '#3b82f6',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{isAr ? 'تم جمعه' : 'Raised'}</span>
                    <span>{isAr ? 'الهدف' : 'Goal'}: {formatCurrency(c.goal_amount, c.currency, locale)}</span>
                  </div>
                </div>

                {c.pledged_amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {isAr ? 'الوعود: ' : 'Pledged: '}{formatCurrency(c.pledged_amount, c.currency, locale)}
                  </p>
                )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{c.start_date}{c.end_date ? ` → ${c.end_date}` : ''}</span>
                </div>

                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/admin/finance/campaigns/${c.id}`}>
                    {isAr ? 'عرض التفاصيل' : 'View Details'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(campaigns || []).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{isAr ? 'لا توجد حملات' : 'No campaigns found'}</p>
            <Button className="mt-4" asChild>
              <Link href="/admin/finance/campaigns/new">
                {isAr ? 'إنشاء حملة جديدة' : 'Create Campaign'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
