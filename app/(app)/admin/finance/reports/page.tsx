import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getCachedFunds } from '@/lib/cache/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, Wallet, HandCoins, FileSpreadsheet,
  PieChart, Users, ArrowRight,
} from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
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

  // Quick stats for the report hub
  const [
    { data: yearDonations },
    funds,
    { data: budgets },
  ] = await Promise.all([
    supabase.from('donations').select('base_amount, fund_id, payment_method').eq('church_id', profile.church_id).gte('donation_date', startOfYear).lte('donation_date', today),
    getCachedFunds(profile.church_id),
    supabase.from('budgets').select('id, name, total_income, total_expense, is_approved').eq('church_id', profile.church_id).eq('is_active', true).limit(5),
  ])

  const totalDonationsYTD = (yearDonations || []).reduce((s, d) => s + (d.base_amount || 0), 0)

  // Giving by payment method
  const byMethod: Record<string, number> = {}
  for (const d of yearDonations || []) {
    const m = d.payment_method || 'other'
    byMethod[m] = (byMethod[m] || 0) + d.base_amount
  }

  const METHOD_KEYS: Record<string, string> = {
    cash: 'cash', check: 'check', bank_transfer: 'bankTransfer', online: 'online',
    credit_card: 'creditCard', mobile_payment: 'mobilePayment', in_kind: 'inKind', other: 'other',
  }

  const reportCards = [
    {
      icon: TrendingUp,
      title: t('incomeStatement'),
      desc: t('incomeStatementDesc'),
      href: '/admin/finance/reports/income-statement',
      color: 'text-green-600', bg: 'bg-green-50',
    },
    {
      icon: Wallet,
      title: t('fundBalancesReport'),
      desc: t('fundBalancesDesc'),
      href: '/admin/finance/reports/fund-balances',
      color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      icon: HandCoins,
      title: t('givingSummary'),
      desc: t('givingSummaryDesc'),
      href: '/admin/finance/reports/giving-summary',
      color: 'text-purple-600', bg: 'bg-purple-50',
    },
    {
      icon: BarChart3,
      title: t('budgetVsActualsReport'),
      desc: t('budgetVsActualsDesc'),
      href: '/admin/finance/reports/budget-vs-actuals',
      color: 'text-orange-600', bg: 'bg-orange-50',
    },
    {
      icon: TrendingUp,
      title: t('givingTrends'),
      desc: t('givingTrendsDesc'),
      href: '/admin/finance/reports/giving-trends',
      color: 'text-teal-600', bg: 'bg-teal-50',
    },
    {
      icon: Users,
      title: t('donorReport'),
      desc: t('donorReportDesc'),
      href: '/admin/finance/reports/donor-report',
      color: 'text-pink-600', bg: 'bg-pink-50',
    },
  ]

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold">{t('financialReports')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('reportsOverview')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('totalGivingYTD')}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalDonationsYTD, 'USD', locale)}</p>
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
            <p className="text-xl font-bold mt-1">{formatCurrency((funds || []).reduce((s, f) => s + (f.current_balance || 0), 0), 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('activeBudgets')}</p>
            <p className="text-xl font-bold mt-1">{(budgets || []).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Giving by method (quick breakdown) */}
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
                      <span className="font-medium">{formatCurrency(amount, 'USD', locale)} ({pct.toFixed(0)}%)</span>
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

      {/* Fund Balances quick view */}
      {(funds || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              {t('fundBalanceSummary')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/finance/funds"><ArrowRight className="w-4 h-4 rtl:rotate-180" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(funds || []).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span>{isAr ? f.name_ar || f.name : f.name}</span>
                  <span className="font-bold">{formatCurrency(f.current_balance || 0, 'USD', locale)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report cards */}
      <div>
        <h2 className="text-base font-semibold mb-4">{t('availableReports')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((r) => (
            <Link key={r.href} href={r.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6 pb-6">
                  <div className={`w-10 h-10 rounded-lg ${r.bg} flex items-center justify-center mb-3`}>
                    <r.icon className={`w-5 h-5 ${r.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm">{r.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
