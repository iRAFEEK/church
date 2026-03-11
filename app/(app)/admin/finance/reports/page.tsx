import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, Wallet, HandCoins, FileSpreadsheet,
  PieChart, Users, ArrowRight,
} from 'lucide-react'
import { getLocale } from 'next-intl/server'

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export default async function FinancialReportsPage() {
  const { profile } = await requirePermission('can_view_finances')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale === 'ar'

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  // Quick stats for the report hub
  const [
    { data: yearDonations },
    { data: funds },
    { data: budgets },
  ] = await Promise.all([
    supabase.from('donations').select('base_amount, fund_id, payment_method').eq('church_id', profile.church_id).gte('donation_date', startOfYear).lte('donation_date', today),
    supabase.from('funds').select('id, name, name_ar, current_balance, target_amount').eq('church_id', profile.church_id).eq('is_active', true).order('display_order'),
    supabase.from('budgets').select('id, name, total_income, total_expense, is_approved').eq('church_id', profile.church_id).eq('is_active', true).limit(5),
  ])

  const totalDonationsYTD = (yearDonations || []).reduce((s, d) => s + (d.base_amount || 0), 0)

  // Giving by payment method
  const byMethod: Record<string, number> = {}
  for (const d of yearDonations || []) {
    const m = d.payment_method || 'other'
    byMethod[m] = (byMethod[m] || 0) + d.base_amount
  }

  const METHOD_LABELS: Record<string, { en: string; ar: string }> = {
    cash: { en: 'Cash', ar: 'نقد' }, check: { en: 'Check', ar: 'شيك' },
    bank_transfer: { en: 'Bank Transfer', ar: 'تحويل' }, online: { en: 'Online', ar: 'أونلاين' },
    credit_card: { en: 'Card', ar: 'بطاقة' }, mobile_payment: { en: 'Mobile', ar: 'موبايل' },
    in_kind: { en: 'In-Kind', ar: 'عيني' }, other: { en: 'Other', ar: 'أخرى' },
  }

  const reportCards = [
    {
      icon: TrendingUp,
      title: isAr ? 'قائمة الدخل' : 'Income Statement',
      desc: isAr ? 'الإيرادات مقابل المصروفات لفترة محددة' : 'Revenue vs expenses for a period',
      href: '/admin/finance/reports/income-statement',
      color: 'text-green-600', bg: 'bg-green-50',
    },
    {
      icon: Wallet,
      title: isAr ? 'أرصدة الصناديق' : 'Fund Balances',
      desc: isAr ? 'حركة كل صندوق وأرصدته' : 'Balance and activity per fund',
      href: '/admin/finance/reports/fund-balances',
      color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      icon: HandCoins,
      title: isAr ? 'ملخص التبرعات' : 'Giving Summary',
      desc: isAr ? 'التبرعات مصنّفة حسب المتبرع والصندوق والفترة' : 'Giving by donor, fund, and period',
      href: '/admin/finance/reports/giving-summary',
      color: 'text-purple-600', bg: 'bg-purple-50',
    },
    {
      icon: BarChart3,
      title: isAr ? 'الميزانية مقابل الفعلي' : 'Budget vs Actuals',
      desc: isAr ? 'مقارنة الميزانية المخططة مع الإنفاق الفعلي' : 'Compare planned budget to actual spending',
      href: '/admin/finance/reports/budget-vs-actuals',
      color: 'text-orange-600', bg: 'bg-orange-50',
    },
    {
      icon: TrendingUp,
      title: isAr ? 'اتجاهات العطاء' : 'Giving Trends',
      desc: isAr ? 'تحليل أنماط العطاء عبر الزمن' : 'Giving patterns over time',
      href: '/admin/finance/reports/giving-trends',
      color: 'text-teal-600', bg: 'bg-teal-50',
    },
    {
      icon: Users,
      title: isAr ? 'تقرير المتبرعين' : 'Donor Report',
      desc: isAr ? 'إجماليات العطاء لكل عضو وكشف الحساب' : 'Per-member giving totals and statements',
      href: '/admin/finance/reports/donor-report',
      color: 'text-pink-600', bg: 'bg-pink-50',
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{isAr ? 'التقارير المالية' : 'Financial Reports'}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr ? 'تقارير ومؤشرات مالية شاملة' : 'Comprehensive financial reports and insights'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي تبرعات هذا العام' : 'Total Giving YTD'}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalDonationsYTD, 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isAr ? 'الصناديق النشطة' : 'Active Funds'}</p>
            <p className="text-xl font-bold mt-1">{(funds || []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي أرصدة الصناديق' : 'Total Fund Balances'}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency((funds || []).reduce((s, f) => s + (f.current_balance || 0), 0), 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isAr ? 'الميزانيات النشطة' : 'Active Budgets'}</p>
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
              {isAr ? 'التبرعات حسب طريقة الدفع (هذا العام)' : 'Giving by Payment Method (YTD)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byMethod).sort(([,a],[,b]) => b - a).map(([method, amount]) => {
                const pct = totalDonationsYTD > 0 ? (amount / totalDonationsYTD) * 100 : 0
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{isAr ? METHOD_LABELS[method]?.ar || method : METHOD_LABELS[method]?.en || method}</span>
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
              {isAr ? 'ملخص أرصدة الصناديق' : 'Fund Balance Summary'}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/finance/funds"><ArrowRight className="w-4 h-4" /></Link>
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
        <h2 className="text-base font-semibold mb-4">{isAr ? 'التقارير المتاحة' : 'Available Reports'}</h2>
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
