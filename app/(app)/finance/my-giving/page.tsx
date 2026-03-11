import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HandCoins, TrendingUp, Calendar, FileText } from 'lucide-react'
import { getLocale } from 'next-intl/server'

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

const METHOD_LABELS: Record<string, { en: string; ar: string }> = {
  cash: { en: 'Cash', ar: 'نقد' }, check: { en: 'Check', ar: 'شيك' },
  bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' }, credit_card: { en: 'Card', ar: 'بطاقة' },
  online: { en: 'Online', ar: 'أونلاين' }, mobile_payment: { en: 'Mobile', ar: 'موبايل' },
  in_kind: { en: 'In-Kind', ar: 'عيني' }, other: { en: 'Other', ar: 'أخرى' },
}

export default async function MyGivingPage() {
  const { profile } = await requirePermission('can_view_own_giving')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale === 'ar'

  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    { data: allDonations },
    { data: thisYearDonations },
    { data: thisMonthDonations },
    { data: pledges },
  ] = await Promise.all([
    supabase
      .from('donations')
      .select('*, fund:fund_id(id, name, name_ar), campaign:campaign_id(id, name, name_ar)')
      .eq('donor_id', profile.id)
      .order('donation_date', { ascending: false })
      .limit(50),
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
      .select('*, campaign:campaign_id(id, name, name_ar)')
      .eq('donor_id', profile.id)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false }),
  ])

  const totalThisYear = (thisYearDonations || []).reduce((s, d) => s + (d.base_amount || 0), 0)
  const totalThisMonth = (thisMonthDonations || []).reduce((s, d) => s + (d.base_amount || 0), 0)
  const totalAllTime = (allDonations as any[] || []).reduce((s: number, d: any) => s + (d.base_amount || 0), 0)

  // Group by year for history
  const byYear: Record<string, any[]> = {}
  for (const d of (allDonations as any[] || [])) {
    const year = d.donation_date.split('-')[0]
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(d)
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{isAr ? 'تبرعاتي' : 'My Giving'}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr ? 'سجل عطائك الشخصي' : 'Your personal giving record'}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isAr ? 'هذا الشهر' : 'This Month'}</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(totalThisMonth, 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isAr ? 'هذا العام' : 'This Year'}</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(totalThisYear, 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي الكل' : 'All Time'}</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(totalAllTime, 'USD', locale)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Pledges */}
      {(pledges || []).filter((p) => p.status === 'active').length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {isAr ? 'التعهدات النشطة' : 'Active Pledges'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(pledges || []).filter((p) => p.status === 'active').map((p) => {
              const pct = p.total_amount > 0 ? Math.min(100, (p.fulfilled_amount / p.total_amount) * 100) : 0
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{p.campaign ? (isAr ? p.campaign.name_ar || p.campaign.name : p.campaign.name) : (isAr ? 'تعهد عام' : 'General Pledge')}</span>
                    <span className="text-muted-foreground">{formatCurrency(p.fulfilled_amount, p.currency, locale)} / {formatCurrency(p.total_amount, p.currency, locale)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  {p.next_due_date && (
                    <p className="text-xs text-muted-foreground">
                      {isAr ? 'الدفعة القادمة: ' : 'Next due: '}{p.next_due_date}
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
        const yearTotal = byYear[year].reduce((s, d) => s + d.base_amount, 0)
        return (
          <Card key={year}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HandCoins className="w-4 h-4" />
                  {year}
                </CardTitle>
                <span className="font-bold text-sm">{formatCurrency(yearTotal, 'USD', locale)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {byYear[year].map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{d.donation_date}</span>
                      {d.fund && (
                        <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                          {isAr ? (d.fund as { name: string; name_ar: string | null }).name_ar || (d.fund as { name: string }).name : (d.fund as { name: string }).name}
                        </span>
                      )}
                      {d.is_tithe && (
                        <Badge variant="outline" className="text-xs">{isAr ? 'عشور' : 'Tithe'}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isAr ? METHOD_LABELS[d.payment_method]?.ar : METHOD_LABELS[d.payment_method]?.en}
                      {d.receipt_number && ` · ${d.receipt_number}`}
                    </p>
                  </div>
                  <span className="font-medium text-green-700">{formatCurrency(d.amount, d.currency, locale)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      {(allDonations || []).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <HandCoins className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{isAr ? 'لا توجد سجلات تبرع بعد' : 'No giving records yet'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
