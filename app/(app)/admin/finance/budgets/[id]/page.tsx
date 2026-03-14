import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

function fmt(n: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await requirePermission('can_view_finances')
  const supabase = await createClient()
  const locale = await getLocale()
  const t = await getTranslations('finance')

  const { data: budget } = await supabase
    .from('budgets')
    .select('id, name, name_ar, currency, total_income, total_expense, start_date, end_date, is_active, line_items:budget_line_items(id, account_id, budgeted_amount, actual_amount, notes, account:accounts(code, name, name_ar))')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (!budget) notFound()

  interface BudgetLineItem {
    id: string
    account_id: string
    budgeted_amount: number
    actual_amount: number | null
    notes: string | null
    account?: { code: string; name: string; name_ar: string | null } | null
  }
  const lineItems: BudgetLineItem[] = (budget.line_items || []) as unknown as BudgetLineItem[]
  const totalBudgeted = lineItems.reduce((s, l) => s + l.budgeted_amount, 0)
  const totalActual = lineItems.reduce((s, l) => s + (l.actual_amount || 0), 0)
  const variance = totalBudgeted - totalActual
  const currency = budget.currency || 'USD'

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/budgets"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /></Link>
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
            <p className="text-sm text-muted-foreground">{t('budgeted')}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums" dir="ltr">{fmt(totalBudgeted, currency, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">{t('actual')}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${totalActual > totalBudgeted ? 'text-red-600' : ''}`} dir="ltr">
              {fmt(totalActual, currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">{t('variance')}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {variance > 0
                ? <TrendingUp className="w-5 h-5 text-green-600" />
                : variance < 0
                ? <TrendingDown className="w-5 h-5 text-red-600" />
                : <Minus className="w-5 h-5 text-muted-foreground" />
              }
              <p className={`text-2xl font-bold tabular-nums ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : ''}`} dir="ltr">
                {fmt(Math.abs(variance), currency, locale)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('budgetVsActuals')}</CardTitle>
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
                      <p className="text-sm font-mono font-semibold tabular-nums" dir="ltr">{fmt(line.budgeted_amount, currency, locale)}</p>
                      <p className={`text-xs font-mono tabular-nums ${over ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                        {lineVariance >= 0 ? '+' : ''}{fmt(lineVariance, currency, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {lineItems.length === 0 && (
              <p className="px-4 py-8 text-center text-muted-foreground text-sm">{t('noLineItems')}</p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start px-4 py-2 font-medium">{t('accounts')}</th>
                <th className="text-end px-4 py-2 font-medium">{t('budgeted')}</th>
                <th className="text-end px-4 py-2 font-medium">{t('actual')}</th>
                <th className="text-end px-4 py-2 font-medium">{t('variance')}</th>
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
                    <td className="px-4 py-2 text-end font-mono tabular-nums" dir="ltr">
                      {fmt(line.budgeted_amount, currency, locale)}
                    </td>
                    <td className={`px-4 py-2 text-end font-mono tabular-nums ${over ? 'text-red-600' : ''}`} dir="ltr">
                      {fmt(actual, currency, locale)}
                    </td>
                    <td className={`px-4 py-2 text-end font-mono tabular-nums ${lineVariance < 0 ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                      {lineVariance >= 0 ? '+' : ''}{fmt(lineVariance, currency, locale)}
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
                    {t('noLineItems')}
                  </td>
                </tr>
              )}
            </tbody>
            {lineItems.length > 0 && (
              <tfoot className="border-t bg-muted/30">
                <tr className="font-semibold">
                  <td className="px-4 py-2">{t('total')}</td>
                  <td className="px-4 py-2 text-end font-mono tabular-nums" dir="ltr">{fmt(totalBudgeted, currency, locale)}</td>
                  <td className={`px-4 py-2 text-end font-mono tabular-nums ${totalActual > totalBudgeted ? 'text-red-600' : ''}`} dir="ltr">
                    {fmt(totalActual, currency, locale)}
                  </td>
                  <td className={`px-4 py-2 text-end font-mono tabular-nums ${variance < 0 ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                    {variance >= 0 ? '+' : ''}{fmt(variance, currency, locale)}
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
