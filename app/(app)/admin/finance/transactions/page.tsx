import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowUpDown } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  posted:   'bg-green-100 text-green-700',
  void:     'bg-red-100 text-red-700',
}

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_finances) redirect('/admin')

  const page = parseInt(sp.page || '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = supabase
    .from('financial_transactions')
    .select('*', { count: 'exact' })
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
          <h1 className="text-2xl font-bold">Transactions / المعاملات</h1>
          <p className="text-muted-foreground text-sm">{count ?? 0} transactions</p>
        </div>
        {perms.can_manage_finances && (
          <Button asChild>
            <Link href="/admin/finance/transactions/new">
              <Plus className="w-4 h-4 mr-2" />New Journal Entry
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <select name="status" defaultValue={sp.status || ''} className="text-sm border rounded px-2 py-1.5 bg-background">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
            <option value="void">Void</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" name="date_from" defaultValue={sp.date_from || ''} className="text-sm border rounded px-2 py-1.5 bg-background" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" name="date_to" defaultValue={sp.date_to || ''} className="text-sm border rounded px-2 py-1.5 bg-background" />
        </div>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
        <Button type="reset" variant="ghost" size="sm" asChild><Link href="/admin/finance/transactions">Clear</Link></Button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Ref #</th>
              <th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Amount</th>
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
                    {txn.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {fmt(txn.total_amount || 0, txn.currency || 'USD')}
                </td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions found
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
              <Link href={`?page=${page - 1}`}>Previous</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground py-1.5">
            Page {page} of {Math.ceil(count / limit)}
          </span>
          {page < Math.ceil(count / limit) && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?page=${page + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
