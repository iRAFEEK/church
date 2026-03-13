import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HandCoins, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'

const PAGE_SIZE = 25

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

const METHOD_KEYS: Record<string, string> = {
  cash: 'cash', check: 'check',
  bank_transfer: 'bankTransfer', credit_card: 'creditCard',
  online: 'online', mobile_payment: 'mobilePayment',
  in_kind: 'inKind', other: 'other',
}

type SearchParams = Promise<{ page?: string }>

export default async function MyGivingPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedParams = await searchParams
  const page = Math.max(1, parseInt(resolvedParams.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  const { profile } = await requirePermission('can_view_own_giving')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale.startsWith('ar')
  const t = await getTranslations('finance')

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    donationsRes,
    { data: thisYearDonations },
    { data: thisMonthDonations },
    { data: pledges },
  ] = await Promise.all([
    supabase
      .from('donations')
      .select('id, amount, base_amount, currency, donation_date, payment_method, receipt_number, is_tithe, fund:fund_id(id, name, name_ar), campaign:campaign_id(id, name, name_ar)', { count: 'exact' })
      .eq('donor_id', profile.id)
      .order('donation_date', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from('donations')
      .select('base_amount')
      .eq('donor_id', profile.id)
      .gte('donation_date', startOfYear)
      .lte('donation_date', today),
    supabase
      .from('donations')
      .select('base_amount')
      .eq('donor_id', profile.id)
      .gte('donation_date', startOfMonth)
      .lte('donation_date', today),
    supabase
      .from('pledges')
      .select('id, total_amount, fulfilled_amount, currency, status, frequency, next_due_date, campaign:campaign_id(id, name, name_ar)')
      .eq('donor_id', profile.id)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false }),
  ])

  const allDonations = donationsRes.data ?? []
  const totalCount = donationsRes.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const totalThisYear = (thisYearDonations || []).reduce((s, d) => s + (d.base_amount || 0), 0)
  const totalThisMonth = (thisMonthDonations || []).reduce((s, d) => s + (d.base_amount || 0), 0)

  // Group current page donations by year for display
  const byYear: Record<string, typeof allDonations> = {}
  for (const d of allDonations) {
    const year = d.donation_date.split('-')[0]
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(d)
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t('myGiving')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('myGivingOverview')}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('thisMonth')}</p>
            <p className="text-lg font-bold mt-1" dir="ltr">{formatCurrency(totalThisMonth, 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('thisYear')}</p>
            <p className="text-lg font-bold mt-1" dir="ltr">{formatCurrency(totalThisYear, 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('totalRecords')}</p>
            <p className="text-lg font-bold mt-1" dir="ltr">{totalCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Pledges */}
      {(pledges ?? []).filter((p) => p.status === 'active').length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('activePledges')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(pledges ?? []).filter((p) => p.status === 'active').map((p) => {
              const pct = p.total_amount > 0 ? Math.min(100, (p.fulfilled_amount / p.total_amount) * 100) : 0
              const rawCampaign = p.campaign as unknown
              const campaign = (Array.isArray(rawCampaign) ? rawCampaign[0] : rawCampaign) as { name: string; name_ar: string | null } | null
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{campaign ? (isAr ? campaign.name_ar || campaign.name : campaign.name) : t('generalPledge')}</span>
                    <span className="text-muted-foreground" dir="ltr">{formatCurrency(p.fulfilled_amount, p.currency, locale)} / {formatCurrency(p.total_amount, p.currency, locale)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  {p.next_due_date && (
                    <p className="text-xs text-muted-foreground">
                      {t('nextDue')}: {p.next_due_date}
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Giving history by year */}
      {Object.keys(byYear).sort((a, b) => b.localeCompare(a)).map((year) => {
        const yearTotal = byYear[year].reduce((s, d) => s + (d.base_amount || 0), 0)
        return (
          <Card key={year}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HandCoins className="w-4 h-4" />
                  {year}
                </CardTitle>
                <span className="font-bold text-sm" dir="ltr">{formatCurrency(yearTotal, 'USD', locale)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {byYear[year].map((d) => {
                const rawFund = d.fund as unknown
                const fund = (Array.isArray(rawFund) ? rawFund[0] : rawFund) as { name: string; name_ar: string | null } | null
                return (
                  <div key={d.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{d.donation_date}</span>
                        {fund && (
                          <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                            {isAr ? fund.name_ar || fund.name : fund.name}
                          </span>
                        )}
                        {d.is_tithe && (
                          <Badge variant="outline" className="text-xs">{t('tithe')}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(METHOD_KEYS[d.payment_method] || 'other')}
                        {d.receipt_number && ` \u00b7 ${d.receipt_number}`}
                      </p>
                    </div>
                    <span className="font-medium text-green-700" dir="ltr">{formatCurrency(d.amount, d.currency, locale)}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {allDonations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <HandCoins className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{t('noGivingRecords')}</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {t('pageOf', { page, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild className="h-9 min-w-[44px]">
                <Link href={`/finance/my-giving?page=${page - 1}`}>
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  <span className="hidden sm:inline ms-1">{t('previous')}</span>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="h-9 min-w-[44px]">
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                <span className="hidden sm:inline ms-1">{t('previous')}</span>
              </Button>
            )}
            {page < totalPages ? (
              <Button variant="outline" size="sm" asChild className="h-9 min-w-[44px]">
                <Link href={`/finance/my-giving?page=${page + 1}`}>
                  <span className="hidden sm:inline me-1">{t('next')}</span>
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="h-9 min-w-[44px]">
                <span className="hidden sm:inline me-1">{t('next')}</span>
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
