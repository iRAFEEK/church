import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Clock, DollarSign } from 'lucide-react'
import { ExpenseApprovalActions } from '@/components/finance/ExpenseApprovalActions'
import { getLocale, getTranslations } from 'next-intl/server'

interface SearchParams { page?: string; status?: string; ministry_id?: string; mine?: string }

interface ExpenseRow {
  id: string; description: string; description_ar: string | null; amount: number; currency: string
  status: string; vendor_name: string | null; vendor_name_ar: string | null
  request_number: string | null; rejection_reason: string | null; created_at: string
  requester?: { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null; photo_url: string | null } | null
  ministry?: { id: string; name: string; name_ar: string | null } | null
  fund?: { id: string; name: string; name_ar: string | null } | null
}

const PAGE_SIZE = 25

const STATUS_CONFIG: Record<string, { icon: string; class: string }> = {
  draft:     { icon: '📝', class: 'bg-gray-100 text-gray-700' },
  submitted: { icon: '📤', class: 'bg-yellow-100 text-yellow-800' },
  approved:  { icon: '✅', class: 'bg-blue-100 text-blue-800' },
  rejected:  { icon: '❌', class: 'bg-red-100 text-red-800' },
  paid:      { icon: '💰', class: 'bg-green-100 text-green-800' },
  cancelled: { icon: '🚫', class: 'bg-gray-100 text-gray-500' },
}

const STATUS_KEYS: Record<string, string> = {
  draft: 'draft', submitted: 'submitted', approved: 'approved',
  rejected: 'rejected', paid: 'paid', cancelled: 'cancelled',
}

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requirePermission('can_submit_expenses')
  const supabase = await createClient()
  const locale = await getLocale()
  const isAr = locale.startsWith('ar')
  const t = await getTranslations('finance')
  const params = await searchParams

  const canApprove = profile.role === 'super_admin' || profile.role === 'ministry_leader'
  const viewMine = params.mine === 'true' || !canApprove

  const page = parseInt(params.page || '1')
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('expense_requests')
    .select(`
      id, description, description_ar, amount, currency, status, vendor_name, vendor_name_ar, request_number, rejection_reason, created_at,
      requester:requested_by ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      ministry:ministry_id ( id, name, name_ar ),
      fund:fund_id ( id, name, name_ar )
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (viewMine) query = query.eq('requested_by', profile.id)
  if (params.status) query = query.eq('status', params.status)
  if (params.ministry_id) query = query.eq('ministry_id', params.ministry_id)

  const [{ data: expenses, count }, { data: ministries }] = await Promise.all([
    query,
    supabase
      .from('ministries')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .order('name'),
  ])

  const typedExpenses = (expenses || []) as unknown as ExpenseRow[]
  const pendingSubmitted = typedExpenses.filter((e) => e.status === 'submitted').length
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('expenseRequests')}
            {canApprove && pendingSubmitted > 0 && (
              <Badge variant="destructive" className="ms-2 text-xs">{pendingSubmitted}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {count} {t('requests')}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/finance/expenses/new">
            <Plus className="w-4 h-4 me-2" />
            {t('newRequest')}
          </Link>
        </Button>
      </div>

      {/* Toggle mine / all (for approvers) */}
      {canApprove && (
        <div className="flex gap-2">
          <Button variant={!viewMine ? 'default' : 'outline'} size="sm" asChild>
            <Link href="?mine=false">{t('allRequests')}</Link>
          </Button>
          <Button variant={viewMine ? 'default' : 'outline'} size="sm" asChild>
            <Link href="?mine=true">{t('myRequests')}</Link>
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <form className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
            <select name="status" defaultValue={params.status || ''} className="w-full sm:w-auto h-11 text-sm border rounded px-2 py-1.5 bg-background">
              <option value="">{t('allStatuses')}</option>
              {Object.entries(STATUS_KEYS).map(([k, tKey]) => (
                <option key={k} value={k}>{t(tKey)}</option>
              ))}
            </select>
            {canApprove && (
              <select name="ministry_id" defaultValue={params.ministry_id || ''} className="w-full sm:w-auto h-11 text-sm border rounded px-2 py-1.5 bg-background">
                <option value="">{t('allMinistries')}</option>
                {(ministries || []).map((m) => (
                  <option key={m.id} value={m.id}>{isAr ? m.name_ar || m.name : m.name}</option>
                ))}
              </select>
            )}
            <Button type="submit" variant="outline" size="sm" className="h-11 w-full sm:w-auto">{t('filter')}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Expenses list */}
      <div className="space-y-3">
        {typedExpenses.map((e) => {
          const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.draft
          const requesterName = e.requester
            ? `${isAr ? e.requester.first_name_ar || e.requester.first_name : e.requester.first_name} ${isAr ? e.requester.last_name_ar || e.requester.last_name : e.requester.last_name}`
            : t('unknown')

          return (
            <Card key={e.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className="text-sm">{e.requester?.first_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{isAr ? e.description_ar || e.description : e.description}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sc.class}`}>{t(STATUS_KEYS[e.status] || 'draft')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{requesterName}</span>
                        {e.ministry && (
                          <>
                            <span>·</span>
                            <span>{isAr ? e.ministry.name_ar || e.ministry.name : e.ministry.name}</span>
                          </>
                        )}
                        {e.vendor_name && (
                          <>
                            <span>·</span>
                            <span>{isAr ? e.vendor_name_ar || e.vendor_name : e.vendor_name}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{e.request_number || e.created_at.split('T')[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-lg">{formatCurrency(e.amount, e.currency, locale)}</span>
                    {canApprove && e.status === 'submitted' && (
                      <ExpenseApprovalActions expenseId={e.id} />
                    )}
                  </div>
                </div>
                {e.rejection_reason && (
                  <p className="text-xs text-red-600 mt-2 ms-12">{t('rejectionReason')}: {e.rejection_reason}</p>
                )}
              </CardContent>
            </Card>
          )
        })}

        {typedExpenses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{t('noExpenseRequests')}</p>
              <Button className="mt-4" asChild>
                <Link href="/admin/finance/expenses/new">
                  {t('submitNewRequest')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('pageOf', { page, total: totalPages })}
          </p>
          <div className="flex gap-2">
            {page > 1 && <Button variant="outline" size="sm" asChild><Link href={`?page=${page - 1}`}>{t('previous')}</Link></Button>}
            {page < totalPages && <Button variant="outline" size="sm" asChild><Link href={`?page=${page + 1}`}>{t('next')}</Link></Button>}
          </div>
        </div>
      )}
    </div>
  )
}
