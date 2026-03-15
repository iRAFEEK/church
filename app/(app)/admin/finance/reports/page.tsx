import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getCachedFunds } from '@/lib/cache/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3, Wallet, HandCoins, PieChart, Users, TrendingUp,
} from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

const METHOD_KEYS: Record<string, string> = {
  cash: 'cash', check: 'check', bank_transfer: 'bankTransfer', online: 'online',
  credit_card: 'creditCard', mobile_payment: 'mobilePayment', in_kind: 'inKind', other: 'other',
}

const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

interface DonationRow {
  base_amount: number | null
  fund_id: string | null
  payment_method: string | null
  donation_date: string
  donor_id: string | null
}

interface DonorDonation {
  base_amount: number | null
  donor: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null } | null
}

interface BudgetLineItem {
  id: string
  account_id: string
  amount_m1: number; amount_m2: number; amount_m3: number; amount_m4: number
  amount_m5: number; amount_m6: number; amount_m7: number; amount_m8: number
  amount_m9: number; amount_m10: number; amount_m11: number; amount_m12: number
  account: { id: string; name: string; name_ar: string | null; account_type: string } | null
}

export default async function FinancialReportsPage() {
  const { profile } = await requirePermission('can_view_finances')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale.startsWith('ar')
  const t = await getTranslations('finance')

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    { data: yearDonations },
    funds,
    { data: budgets },
    { data: topDonors },
  ] = await Promise.all([
    supabase
      .from('donations')
      .select('base_amount, fund_id, payment_method, donation_date, donor_id')
      .eq('church_id', profile.church_id)
      .gte('donation_date', startOfYear)
      .lte('donation_date', today)
      .limit(5000),
    getCachedFunds(profile.church_id),
    supabase
      .from('budgets')
      .select('id, name, name_ar, total_income, total_expense, is_approved')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .limit(10),
    supabase
      .from('donations')
      .select('base_amount, donor:donor_id ( id, first_name, last_name, first_name_ar, last_name_ar )')
      .eq('church_id', profile.church_id)
      .gte('donation_date', startOfYear)
      .not('donor_id', 'is', null)
      .limit(5000),
  ])

  const typedDonations = (yearDonations || []) as DonationRow[]
  const totalDonationsYTD = typedDonations.reduce((s, d) => s + (d.base_amount || 0), 0)

  // Giving by payment method
  const byMethod: Record<string, number> = {}
  for (const d of typedDonations) {
    const m = d.payment_method || 'other'
    byMethod[m] = (byMethod[m] || 0) + (d.base_amount || 0)
  }

  // Monthly trend
  const monthlyTotals = new Array(12).fill(0)
  for (const d of typedDonations) {
    const month = new Date(d.donation_date).getMonth()
    monthlyTotals[month] += d.base_amount || 0
  }
  const maxMonthly = Math.max(...monthlyTotals, 1)

  // Top donors
  const donorTotals = new Map<string, { name: string; total: number; count: number }>()
  for (const d of (topDonors || []) as unknown as DonorDonation[]) {
    if (!d.donor) continue
    const id = d.donor.id
    const existing = donorTotals.get(id)
    const name = isAr
      ? `${d.donor.first_name_ar || d.donor.first_name || ''} ${d.donor.last_name_ar || d.donor.last_name || ''}`.trim()
      : `${d.donor.first_name || ''} ${d.donor.last_name || ''}`.trim()
    if (existing) {
      existing.total += d.base_amount || 0
      existing.count++
    } else {
      donorTotals.set(id, { name: name || t('anonymous'), total: d.base_amount || 0, count: 1 })
    }
  }
  const topDonorList = [...donorTotals.values()].sort((a, b) => b.total - a.total).slice(0, 10)

  // Budget line items for active budgets
  let budgetLineItems: BudgetLineItem[] = []
  if (budgets && budgets.length > 0) {
    const { data: lineItems } = await supabase
      .from('budget_line_items')
      .select('id, account_id, amount_m1, amount_m2, amount_m3, amount_m4, amount_m5, amount_m6, amount_m7, amount_m8, amount_m9, amount_m10, amount_m11, amount_m12, account:account_id ( id, name, name_ar, account_type )')
      .eq('budget_id', budgets[0].id)
      .limit(50)
    budgetLineItems = (lineItems || []) as unknown as BudgetLineItem[]
  }

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold">{t('financialReports')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('reportsOverview')}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('totalGivingYTD')}</p>
            <p className="text-xl font-bold mt-1" dir="ltr">{formatCurrency(totalDonationsYTD, 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('activeFunds')}</p>
            <p className="text-xl font-bold mt-1">{(funds || []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('totalFundBalances')}</p>
            <p className="text-xl font-bold mt-1" dir="ltr">{formatCurrency((funds || []).reduce((s, f) => s + (f.current_balance || 0), 0), 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('activeBudgets')}</p>
            <p className="text-xl font-bold mt-1">{(budgets || []).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Giving Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('monthlyGivingTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {monthlyTotals.map((amount, i) => {
              const height = maxMonthly > 0 ? (amount / maxMonthly) * 100 : 0
              const isCurrent = i === now.getMonth()
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${isCurrent ? 'bg-primary' : 'bg-primary/30'}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={formatCurrency(amount, 'USD', locale)}
                  />
                  <span className="text-[10px] text-muted-foreground">{t(MONTH_KEYS[i])}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Giving by Payment Method */}
      {Object.keys(byMethod).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              {t('givingByMethod')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byMethod).sort(([,a],[,b]) => b - a).map(([method, amount]) => {
                const pct = totalDonationsYTD > 0 ? (amount / totalDonationsYTD) * 100 : 0
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t(METHOD_KEYS[method] || 'other')}</span>
                      <span className="font-medium" dir="ltr">{formatCurrency(amount, 'USD', locale)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fund Balances */}
      {(funds || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              {t('fundBalanceSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {(funds || []).map(f => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{isAr ? f.name_ar || f.name : f.name}</span>
                  <span className="text-sm font-bold" dir="ltr">{formatCurrency(f.current_balance || 0, 'USD', locale)}</span>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-2 font-medium">{t('fund')}</th>
                    <th className="text-end py-2 font-medium">{t('balance')}</th>
                    <th className="text-end py-2 font-medium">{t('target')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(funds || []).map(f => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="py-2">{isAr ? f.name_ar || f.name : f.name}</td>
                      <td className="py-2 text-end font-mono" dir="ltr">{formatCurrency(f.current_balance || 0, 'USD', locale)}</td>
                      <td className="py-2 text-end font-mono text-muted-foreground" dir="ltr">{f.target_amount ? formatCurrency(f.target_amount, 'USD', locale) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Donors */}
      {topDonorList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('topDonors')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {topDonorList.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.count} {t('donationRecords')}</p>
                  </div>
                  <span className="text-sm font-bold" dir="ltr">{formatCurrency(d.total, 'USD', locale)}</span>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-2 font-medium">#</th>
                    <th className="text-start py-2 font-medium">{t('donor')}</th>
                    <th className="text-end py-2 font-medium">{t('totalAmount')}</th>
                    <th className="text-end py-2 font-medium">{t('count')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topDonorList.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2">{d.name}</td>
                      <td className="py-2 text-end font-mono" dir="ltr">{formatCurrency(d.total, 'USD', locale)}</td>
                      <td className="py-2 text-end">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget vs Actuals */}
      {budgets && budgets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('budgetVsActualsReport')}: {isAr ? budgets[0].name_ar || budgets[0].name : budgets[0].name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetLineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('noBudgetLines')}</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {budgetLineItems.map(li => {
                    const budgetTotal = li.amount_m1 + li.amount_m2 + li.amount_m3 + li.amount_m4 +
                      li.amount_m5 + li.amount_m6 + li.amount_m7 + li.amount_m8 +
                      li.amount_m9 + li.amount_m10 + li.amount_m11 + li.amount_m12
                    return (
                      <div key={li.id} className="py-2 border-b last:border-0">
                        <p className="text-sm font-medium">{isAr ? li.account?.name_ar || li.account?.name : li.account?.name}</p>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{t('budget')}: <span dir="ltr">{formatCurrency(budgetTotal, 'USD', locale)}</span></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-2 font-medium">{t('account')}</th>
                        <th className="text-start py-2 font-medium">{t('type')}</th>
                        <th className="text-end py-2 font-medium">{t('budgetAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetLineItems.map(li => {
                        const budgetTotal = li.amount_m1 + li.amount_m2 + li.amount_m3 + li.amount_m4 +
                          li.amount_m5 + li.amount_m6 + li.amount_m7 + li.amount_m8 +
                          li.amount_m9 + li.amount_m10 + li.amount_m11 + li.amount_m12
                        return (
                          <tr key={li.id} className="border-b last:border-0">
                            <td className="py-2">{isAr ? li.account?.name_ar || li.account?.name : li.account?.name}</td>
                            <td className="py-2 text-muted-foreground">{li.account?.account_type}</td>
                            <td className="py-2 text-end font-mono" dir="ltr">{formatCurrency(budgetTotal, 'USD', locale)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state when no data at all */}
      {totalDonationsYTD === 0 && (funds || []).length === 0 && (!budgets || budgets.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <HandCoins className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('noReportData')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
