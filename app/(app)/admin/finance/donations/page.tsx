import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Download, HandCoins, Users, Filter } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

interface SearchParams { page?: string; fund_id?: string; method?: string; date_from?: string; date_to?: string }

interface DonationRow {
  id: string; amount: number; currency: string; base_amount: number | null; donation_date: string
  payment_method: string; receipt_number: string | null; is_anonymous: boolean; is_tithe: boolean
  donor?: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null } | null
  fund?: { id: string; name: string; name_ar: string | null } | null
  campaign?: { id: string; name: string; name_ar: string | null } | null
}

const PAGE_SIZE = 25

const METHOD_KEYS: Record<string, string> = {
  cash: 'cash',
  check: 'check',
  bank_transfer: 'bankTransfer',
  credit_card: 'creditCard',
  online: 'online',
  mobile_payment: 'mobilePayment',
  in_kind: 'inKind',
  other: 'other',
}

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export default async function DonationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requirePermission('can_manage_donations')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale.startsWith('ar')
  const t = await getTranslations('finance')
  const params = await searchParams

  const page = parseInt(params.page || '1')
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('donations')
    .select(`
      id, amount, currency, base_amount, donation_date, payment_method, receipt_number, is_anonymous, is_tithe,
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

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [{ data: donations, count }, { data: stats }, { data: funds }] = await Promise.all([
    query,
    supabase
      .from('donations')
      .select('base_amount')
      .eq('church_id', profile.church_id)
      .gte('donation_date', startOfMonth),
    supabase
      .from('funds')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .order('name'),
  ])

  const typedDonations = (donations || []) as unknown as DonationRow[]
  const totalThisMonth = (stats || []).reduce((s: number, d: { base_amount?: number }) => s + (d.base_amount || 0), 0)
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('donations')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {count} {t('donationRecords')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link href="/admin/finance/donations/batch">
              <Users className="w-4 h-4 me-2" />
              {t('batchEntry')}
            </Link>
          </Button>
          <Button size="sm" asChild className="w-full sm:w-auto">
            <Link href="/admin/finance/donations/new">
              <Plus className="w-4 h-4 me-2" />
              {t('newDonation')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-4 pb-4 flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground">{t('thisMonth')}</p>
            <p className="text-lg font-bold">{formatCurrency(totalThisMonth, 'USD', locale)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('totalRecords')}</p>
            <p className="text-lg font-bold">{count || 0}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <form className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
            <select name="fund_id" defaultValue={params.fund_id || ''} className="w-full sm:w-auto h-11 text-sm border rounded px-2 py-1.5 bg-background">
              <option value="">{t('allFunds')}</option>
              {(funds || []).map((f) => (
                <option key={f.id} value={f.id}>{isAr ? f.name_ar || f.name : f.name}</option>
              ))}
            </select>
            <select name="method" defaultValue={params.method || ''} className="w-full sm:w-auto h-11 text-sm border rounded px-2 py-1.5 bg-background">
              <option value="">{t('allMethods')}</option>
              {Object.entries(METHOD_KEYS).map(([k, tKey]) => (
                <option key={k} value={k}>{t(tKey)}</option>
              ))}
            </select>
            <input type="date" name="date_from" defaultValue={params.date_from || ''} className="w-full sm:w-auto h-11 text-sm border rounded px-2 py-1.5 bg-background" />
            <input type="date" name="date_to" defaultValue={params.date_to || ''} className="w-full sm:w-auto h-11 text-sm border rounded px-2 py-1.5 bg-background" />
            <Button type="submit" variant="outline" size="sm" className="h-11 w-full sm:w-auto">
              <Filter className="w-4 h-4 me-1" />
              {t('apply')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile card list */}
          <div className="md:hidden divide-y">
            {typedDonations.map((d) => {
              const donorName = d.is_anonymous
                ? t('anonymous')
                : d.donor
                  ? `${isAr ? d.donor.first_name_ar || d.donor.first_name : d.donor.first_name} ${isAr ? d.donor.last_name_ar || d.donor.last_name : d.donor.last_name}`
                  : '—'
              return (
                <div key={d.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{donorName}</p>
                      {d.is_tithe && <Badge variant="outline" className="text-xs shrink-0">{t('tithe')}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.fund ? (isAr ? d.fund.name_ar || d.fund.name : d.fund.name) : '—'} · {d.donation_date}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="font-bold text-sm text-green-700" dir="ltr">{formatCurrency(d.amount, d.currency, locale)}</p>
                    <Badge variant="secondary" className="text-xs">
                      {t(METHOD_KEYS[d.payment_method] || 'other')}
                    </Badge>
                  </div>
                </div>
              )
            })}
            {typedDonations.length === 0 && (
              <p className="px-4 py-8 text-center text-muted-foreground text-sm">
                {t('noDonationsFound')}
              </p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-start px-4 py-3 font-medium">{t('donor')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('amount')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('fund')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('paymentMethod')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('date')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('receipt')}</th>
                </tr>
              </thead>
              <tbody>
                {typedDonations.map((d) => (
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
                            ? t('anonymous')
                            : d.donor
                              ? `${isAr ? d.donor.first_name_ar || d.donor.first_name : d.donor.first_name} ${isAr ? d.donor.last_name_ar || d.donor.last_name : d.donor.last_name}`
                              : '—'}
                        </span>
                        {d.is_tithe && <Badge variant="outline" className="text-xs">{t('tithe')}</Badge>}
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
                        {t(METHOD_KEYS[d.payment_method] || 'other')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.donation_date}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.receipt_number || '—'}</td>
                  </tr>
                ))}
                {typedDonations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {t('noDonationsFound')}
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
                {t('pageOf', { page, total: totalPages })}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?page=${page - 1}`}>{t('previous')}</Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?page=${page + 1}`}>{t('next')}</Link>
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
