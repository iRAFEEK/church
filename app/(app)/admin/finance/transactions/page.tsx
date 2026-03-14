import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowUpDown } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

const STATUS_COLOR: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  posted:   'bg-green-100 text-green-700',
  void:     'bg-red-100 text-red-700',
}

function fmt(n: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const { profile, resolvedPermissions: perms } = await requirePermission('can_manage_finances')
  const supabase = await createClient()

  const locale = await getLocale()
  const t = await getTranslations('finance')

  const page = parseInt(sp.page || '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = supabase
    .from('financial_transactions')
    .select('id, reference_number, transaction_date, description, status, total_amount, currency', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (sp.status) query = query.eq('status', sp.status)
  if (sp.date_from) query = query.gte('transaction_date', sp.date_from)
  if (sp.date_to) query = query.lte('transaction_date', sp.date_to)

  const { data: transactions, count } = await query

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('transactions')}</h1>
          <p className="text-muted-foreground text-sm">{count ?? 0} {t('transactions')}</p>
        </div>
        {perms.can_manage_finances && (
          <Button asChild>
            <Link href="/admin/finance/transactions/new">
              <Plus className="w-4 h-4 me-2" />{t('newTransaction')}
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t('status')}</label>
          <select name="status" defaultValue={sp.status || ''} className="text-sm border rounded px-2 py-1.5 bg-background">
            <option value="">{t('allStatuses')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="approved">{t('approved')}</option>
            <option value="posted">{t('posted')}</option>
            <option value="void">{t('void')}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t('from')}</label>
          <input type="date" name="date_from" defaultValue={sp.date_from || ''} className="text-sm border rounded px-2 py-1.5 bg-background" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t('to')}</label>
          <input type="date" name="date_to" defaultValue={sp.date_to || ''} className="text-sm border rounded px-2 py-1.5 bg-background" />
        </div>
        <Button type="submit" variant="outline" size="sm">{t('filter')}</Button>
        <Button type="reset" variant="ghost" size="sm" asChild><Link href="/admin/finance/transactions">{t('clear')}</Link></Button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        {/* Mobile card list */}
        <div className="md:hidden divide-y">
          {(transactions || []).map(txn => (
            <Link key={txn.id} href={`/admin/finance/transactions/${txn.id}`}
              className="block px-4 py-3 hover:bg-muted/30 active:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{txn.description || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{txn.reference_number || txn.id.slice(0, 8)} · {txn.transaction_date}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="font-mono text-sm font-semibold tabular-nums" dir="ltr">{fmt(txn.total_amount || 0, txn.currency || 'USD', locale)}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[txn.status] || 'bg-gray-100 text-gray-700'}`}>
                    {t(txn.status)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {(!transactions || transactions.length === 0) && (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">{t('noTransactions')}</p>
          )}
        </div>

        {/* Desktop table */}
        <table className="w-full text-sm hidden md:table">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start px-4 py-2 font-medium">{t('refNumber')}</th>
              <th className="text-start px-4 py-2 font-medium">{t('date')}</th>
              <th className="text-start px-4 py-2 font-medium">{t('description')}</th>
              <th className="text-start px-4 py-2 font-medium">{t('status')}</th>
              <th className="text-end px-4 py-2 font-medium">{t('amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(transactions || []).map(txn => (
              <tr key={txn.id} className="hover:bg-muted/30">
                <td className="px-4 py-2">
                  <Link href={`/admin/finance/transactions/${txn.id}`} className="font-mono text-blue-600 hover:underline text-xs">
                    {txn.reference_number || txn.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{txn.transaction_date}</td>
                <td className="px-4 py-2 max-w-xs truncate">{txn.description || '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[txn.status] || 'bg-gray-100 text-gray-700'}`}>
                    {t(txn.status)}
                  </span>
                </td>
                <td className="px-4 py-2 text-end font-mono tabular-nums">
                  {fmt(txn.total_amount || 0, txn.currency || 'USD', locale)}
                </td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('noTransactions')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {count && count > limit && (
        <div className="flex gap-2 justify-center">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?page=${page - 1}`}>{t('previous')}</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground py-1.5">
            {t('pageOf', { page, total: Math.ceil(count / limit) })}
          </span>
          {page < Math.ceil(count / limit) && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?page=${page + 1}`}>{t('next')}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
