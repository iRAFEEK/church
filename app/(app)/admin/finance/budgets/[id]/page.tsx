import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

type LineItem = {
  id: string
  account_id: string
  account?: { code: string; name: string; name_ar: string | null }
  budgeted_amount: number
  actual_amount?: number
  notes?: string
}

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_finances) redirect('/admin')

  const { data: budget } = await supabase
    .from('budgets')
    .select('*, line_items:budget_line_items(*, account:accounts(code, name, name_ar))')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (!budget) notFound()

  const lineItems: LineItem[] = budget.line_items || []
  const totalBudgeted = lineItems.reduce((s, l) => s + l.budgeted_amount, 0)
  const totalActual = lineItems.reduce((s, l) => s + (l.actual_amount || 0), 0)
  const variance = totalBudgeted - totalActual
  const currency = budget.currency || 'USD'

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/budgets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">{budget.name}</h1>
          {budget.name_ar && <p className="text-sm text-muted-foreground" dir="rtl">{budget.name_ar}</p>}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">Budgeted / المخطط</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalBudgeted, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">Actual / الفعلي</p>
            <p className={`text-2xl font-bold mt-1 ${totalActual > totalBudgeted ? 'text-red-600' : ''}`}>
              {fmt(totalActual, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">Variance / الفرق</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {variance > 0
                ? <TrendingUp className="w-5 h-5 text-green-600" />
                : variance < 0
                ? <TrendingDown className="w-5 h-5 text-red-600" />
                : <Minus className="w-5 h-5 text-muted-foreground" />
              }
              <p className={`text-2xl font-bold ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : ''}`}>
                {fmt(Math.abs(variance), currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget vs. Actuals / الميزانية مقابل الفعلي</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile card list */}
          <div className="md:hidden divide-y">
            {lineItems.map(line => {
              const actual = line.actual_amount || 0
              const lineVariance = line.budgeted_amount - actual
              const over = actual > line.budgeted_amount
              return (
                <div key={line.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{line.account?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{line.account?.code}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <p className="text-sm font-mono font-semibold" dir="ltr">{fmt(line.budgeted_amount, currency)}</p>
                      <p className={`text-xs font-mono ${over ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                        {lineVariance >= 0 ? '+' : ''}{fmt(lineVariance, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {lineItems.length === 0 && (
              <p className="px-4 py-8 text-center text-muted-foreground text-sm">No line items yet.</p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start px-4 py-2 font-medium">Account</th>
                <th className="text-end px-4 py-2 font-medium">Budgeted</th>
                <th className="text-end px-4 py-2 font-medium">Actual</th>
                <th className="text-end px-4 py-2 font-medium">Variance</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lineItems.map(line => {
                const actual = line.actual_amount || 0
                const lineVariance = line.budgeted_amount - actual
                const pct = line.budgeted_amount > 0 ? (actual / line.budgeted_amount) * 100 : 0
                const over = actual > line.budgeted_amount

                return (
                  <tr key={line.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <div>
                        <p className="font-medium">{line.account?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{line.account?.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-end font-mono tabular-nums">
                      {fmt(line.budgeted_amount, currency)}
                    </td>
                    <td className={`px-4 py-2 text-end font-mono tabular-nums ${over ? 'text-red-600' : ''}`}>
                      {fmt(actual, currency)}
                    </td>
                    <td className={`px-4 py-2 text-end font-mono tabular-nums ${lineVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {lineVariance >= 0 ? '+' : ''}{fmt(lineVariance, currency)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden w-16">
                        <div
                          className={`h-full rounded-full ${over ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No line items yet. Add accounts to track spending.
                  </td>
                </tr>
              )}
            </tbody>
            {lineItems.length > 0 && (
              <tfoot className="border-t bg-muted/30">
                <tr className="font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-end font-mono">{fmt(totalBudgeted, currency)}</td>
                  <td className={`px-4 py-2 text-end font-mono ${totalActual > totalBudgeted ? 'text-red-600' : ''}`}>
                    {fmt(totalActual, currency)}
                  </td>
                  <td className={`px-4 py-2 text-end font-mono ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {variance >= 0 ? '+' : ''}{fmt(variance, currency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
