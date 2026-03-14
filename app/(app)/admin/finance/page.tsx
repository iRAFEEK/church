import { Suspense } from 'react'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getCachedFunds } from '@/lib/cache/queries'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign, TrendingUp, HandCoins, Receipt,
  Target, Wallet, ArrowRight, Clock,
} from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import type { DonationWithDonor } from '@/types'
import { FinanceSkeleton } from '@/components/finance/FinanceSkeleton'

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function FinanceDashboardPage() {
  const { profile, church } = await requirePermission('can_view_finances')
  const t = await getTranslations('finance')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('overview')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/finance/donations/new">
              <HandCoins className="w-4 h-4 me-2" />
              {t('recordDonation')}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/finance/expenses/new">
              <Receipt className="w-4 h-4 me-2" />
              {t('expenseRequest')}
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<FinanceSkeleton />}>
        <DashboardContent
          churchId={profile.church_id}
          defaultCurrency={(church as { default_currency?: string })?.default_currency || 'USD'}
        />
      </Suspense>
    </div>
  )
}

async function DashboardContent({ churchId, defaultCurrency }: { churchId: string; defaultCurrency: string }) {
  const supabase = await createClient()
  const locale = await getLocale()
  const t = await getTranslations('finance')
  const isAr = locale.startsWith('ar')
  const currency = defaultCurrency

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    funds,
    { data: donationsThisMonth },
    { data: donationsThisYear },
    { data: recentDonations },
    { data: pendingExpenses },
    { data: activeCampaigns },
  ] = await Promise.all([
    getCachedFunds(churchId),
    supabase.from('donations').select('base_amount').eq('church_id', churchId).gte('donation_date', startOfMonth).lte('donation_date', today),
    supabase.from('donations').select('base_amount').eq('church_id', churchId).gte('donation_date', startOfYear).lte('donation_date', today),
    supabase.from('donations').select('*, donor:donor_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url), fund:fund_id(id, name, name_ar)').eq('church_id', churchId).order('donation_date', { ascending: false }).limit(5),
    supabase.from('expense_requests').select('id, amount, currency, description, description_ar, status, requested_by, created_at, requester:requested_by(id, first_name, last_name, first_name_ar, last_name_ar)').eq('church_id', churchId).in('status', ['submitted', 'approved']).order('created_at', { ascending: false }),
    supabase.from('campaigns').select('id, name, name_ar, goal_amount, raised_amount, currency').eq('church_id', churchId).eq('status', 'active').order('start_date', { ascending: false }).limit(4),
  ])

  const totalIncomeThisMonth = (donationsThisMonth || []).reduce((s, d) => s + (d.base_amount || 0), 0)
  const totalIncomeThisYear = (donationsThisYear || []).reduce((s, d) => s + (d.base_amount || 0), 0)
  const pendingCount = (pendingExpenses || []).filter((e) => e.status === 'submitted').length
  const pendingAmount = (pendingExpenses || []).filter((e) => e.status === 'submitted').reduce((s, e) => s + (e.amount || 0), 0)

  const expenseStatusColor: Record<string, string> = {
    submitted: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('incomeThisMonth')}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalIncomeThisMonth, currency, locale)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('incomeThisYear')}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalIncomeThisYear, currency, locale)}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('pendingExpenses')}</p>
                <p className="text-2xl font-bold mt-1">{pendingCount}</p>
                {pendingAmount > 0 && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(pendingAmount, currency, locale)}</p>
                )}
              </div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('activeCampaigns')}</p>
                <p className="text-2xl font-bold mt-1">{(activeCampaigns || []).length}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fund Balances */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              {t('fundBalances')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/finance/funds">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(funds || []).length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noFundsYet')}</p>
            ) : (
              (funds || []).map((fund) => (
                <div key={fund.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{isAr ? fund.name_ar || fund.name : fund.name}</span>
                    <span className="font-bold">{formatCurrency(fund.current_balance, currency, locale)}</span>
                  </div>
                  {fund.target_amount && (
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (fund.current_balance / fund.target_amount) * 100)}%` }}
                      />
                    </div>
                  )}
                  {fund.is_restricted && (
                    <span className="text-xs text-orange-600">{t('restricted')}</span>
                  )}
                </div>
              ))
            )}
            <Button variant="outline" className="w-full mt-2" size="sm" asChild>
              <Link href="/admin/finance/funds">
                {t('manageFunds')}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Donations */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HandCoins className="w-4 h-4" />
              {t('recentDonations')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/finance/donations">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(recentDonations || []).length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noDonationsYet')}</p>
            ) : (
              <div className="space-y-3">
                {(recentDonations as DonationWithDonor[]).map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                        {d.is_anonymous ? '?' : (d.donor?.first_name?.[0] || '?')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {d.is_anonymous
                            ? t('anonymous')
                            : d.donor
                              ? `${isAr ? d.donor.first_name_ar || d.donor.first_name : d.donor.first_name} ${isAr ? d.donor.last_name_ar || d.donor.last_name : d.donor.last_name}`
                              : t('unknown')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.fund ? (isAr ? d.fund.name_ar || d.fund.name : d.fund.name) : ''} · {d.donation_date}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(d.amount, d.currency, locale)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Expense Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              {t('expenseRequests')}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-xs">{pendingCount}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/finance/expenses">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(pendingExpenses || []).length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noPendingRequests')}</p>
            ) : (
              <div className="space-y-2">
                {(pendingExpenses || []).slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{isAr ? e.description_ar || e.description : e.description}</p>
                      <p className="text-xs text-muted-foreground">{e.created_at.split('T')[0]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{formatCurrency(e.amount, e.currency, locale)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${expenseStatusColor[e.status] || 'bg-gray-100 text-gray-800'}`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t('activeCampaigns')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/finance/campaigns">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(activeCampaigns || []).length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('noActiveCampaigns')}</p>
            ) : (
              <div className="space-y-4">
                {(activeCampaigns || []).map((c) => {
                  const pct = c.goal_amount > 0 ? Math.min(100, (c.raised_amount / c.goal_amount) * 100) : 0
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{isAr ? c.name_ar || c.name : c.name}</span>
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatCurrency(c.raised_amount, c.currency, locale)} {t('raised')}</span>
                        <span>{t('goal')}: {formatCurrency(c.goal_amount, c.currency, locale)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
