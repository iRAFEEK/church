import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Download, HandCoins, Users, Filter } from 'lucide-react'
import { getLocale } from 'next-intl/server'
import type { DonationWithDonor } from '@/types'

interface SearchParams { page?: string; fund_id?: string; method?: string; date_from?: string; date_to?: string }
const PAGE_SIZE = 25

const METHOD_LABELS: Record<string, { en: string; ar: string }> = {
  cash:           { en: 'Cash',          ar: 'نقد' },
  check:          { en: 'Check',         ar: 'شيك' },
  bank_transfer:  { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  credit_card:    { en: 'Card',          ar: 'بطاقة' },
  online:         { en: 'Online',        ar: 'أونلاين' },
  mobile_payment: { en: 'Mobile',        ar: 'موبايل' },
  in_kind:        { en: 'In-Kind',       ar: 'عيني' },
  other:          { en: 'Other',         ar: 'أخرى' },
}

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export default async function DonationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requirePermission('can_manage_donations')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale === 'ar'
  const params = await searchParams

  const page = parseInt(params.page || '1')
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('donations')
    .select(`
      *,
      donor:donor_id ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      fund:fund_id ( id, name, name_ar ),
      campaign:campaign_id ( id, name, name_ar )
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('donation_date', { ascending: false })
    .range(from, to)

  if (params.fund_id) query = query.eq('fund_id', params.fund_id)
  if (params.method) query = query.eq('payment_method', params.method)
  if (params.date_from) query = query.gte('donation_date', params.date_from)
  if (params.date_to) query = query.lte('donation_date', params.date_to)

  const { data: donations, count } = await query

  // Summary stats
  const { data: stats } = await supabase
    .from('donations')
    .select('base_amount, payment_method')
    .eq('church_id', profile.church_id)
    .gte('donation_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])

  const totalThisMonth = (stats || []).reduce((s, d) => s + (d.base_amount || 0), 0)

  // Funds for filter
  const { data: funds } = await supabase
    .from('funds')
    .select('id, name, name_ar')
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .order('name')

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'التبرعات' : 'Donations'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {count} {isAr ? 'سجل تبرع' : 'donation records'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/finance/donations/batch">
              <Users className="w-4 h-4 mr-2" />
              {isAr ? 'دفعة جماعية' : 'Batch Entry'}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/finance/donations/new">
              <Plus className="w-4 h-4 mr-2" />
              {isAr ? 'تبرع جديد' : 'New Donation'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-4 pb-4 flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground">{isAr ? 'هذا الشهر' : 'This Month'}</p>
            <p className="text-lg font-bold">{formatCurrency(totalThisMonth, 'USD', locale)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي السجلات' : 'Total Records'}</p>
            <p className="text-lg font-bold">{count || 0}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <form className="flex flex-wrap gap-3 items-center">
            <select name="fund_id" defaultValue={params.fund_id || ''} className="text-sm border rounded px-2 py-1.5 bg-background">
              <option value="">{isAr ? 'كل الصناديق' : 'All Funds'}</option>
              {(funds || []).map((f) => (
                <option key={f.id} value={f.id}>{isAr ? f.name_ar || f.name : f.name}</option>
              ))}
            </select>
            <select name="method" defaultValue={params.method || ''} className="text-sm border rounded px-2 py-1.5 bg-background">
              <option value="">{isAr ? 'كل الطرق' : 'All Methods'}</option>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
              ))}
            </select>
            <input type="date" name="date_from" defaultValue={params.date_from || ''} className="text-sm border rounded px-2 py-1.5 bg-background" />
            <input type="date" name="date_to" defaultValue={params.date_to || ''} className="text-sm border rounded px-2 py-1.5 bg-background" />
            <Button type="submit" variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              {isAr ? 'تطبيق' : 'Filter'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-start px-4 py-3 font-medium">{isAr ? 'المتبرع' : 'Donor'}</th>
                  <th className="text-start px-4 py-3 font-medium">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="text-start px-4 py-3 font-medium">{isAr ? 'الصندوق' : 'Fund'}</th>
                  <th className="text-start px-4 py-3 font-medium">{isAr ? 'الطريقة' : 'Method'}</th>
                  <th className="text-start px-4 py-3 font-medium">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="text-start px-4 py-3 font-medium">{isAr ? 'الإيصال' : 'Receipt'}</th>
                </tr>
              </thead>
              <tbody>
                {(donations as DonationWithDonor[] || []).map((d) => (
                  <tr key={d.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs">
                            {d.is_anonymous ? '?' : (d.donor?.first_name?.[0] || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {d.is_anonymous
                            ? (isAr ? 'مجهول' : 'Anonymous')
                            : d.donor
                              ? `${isAr ? d.donor.first_name_ar || d.donor.first_name : d.donor.first_name} ${isAr ? d.donor.last_name_ar || d.donor.last_name : d.donor.last_name}`
                              : (isAr ? 'غير محدد' : '—')}
                        </span>
                        {d.is_tithe && <Badge variant="outline" className="text-xs">{isAr ? 'عشور' : 'Tithe'}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-700">
                      {formatCurrency(d.amount, d.currency, locale)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.fund ? (isAr ? d.fund.name_ar || d.fund.name : d.fund.name) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {isAr ? METHOD_LABELS[d.payment_method]?.ar : METHOD_LABELS[d.payment_method]?.en}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.donation_date}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.receipt_number || '—'}</td>
                  </tr>
                ))}
                {(donations || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {isAr ? 'لا توجد تبرعات' : 'No donations found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                {isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?page=${page - 1}`}>{isAr ? 'السابق' : 'Previous'}</Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?page=${page + 1}`}>{isAr ? 'التالي' : 'Next'}</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
