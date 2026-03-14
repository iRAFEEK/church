import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, BarChart3 } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

function fmt(n: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

export default async function BudgetsPage() {
  const { profile, resolvedPermissions: perms } = await requirePermission('can_manage_budgets')
  const supabase = await createClient()

  const locale = await getLocale()
  const t = await getTranslations('finance')
  const isAr = locale.startsWith('ar')

  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, name, name_ar, period_type, start_date, end_date, total_income, total_expense, is_active, currency')
    .eq('church_id', profile.church_id)
    .order('start_date', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('budgets')}</h1>
          <p className="text-muted-foreground text-sm">{budgets?.length ?? 0} {t('budgets')}</p>
        </div>
        {perms.can_manage_budgets && (
          <Button asChild>
            <Link href="/admin/finance/budgets/new">
              <Plus className="w-4 h-4 me-2" />{t('newBudget')}
            </Link>
          </Button>
        )}
      </div>

      {(!budgets || budgets.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{t('noBudgets')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map(budget => {
            const usedPct = budget.total_income > 0
              ? Math.min(100, ((budget.total_expense || 0) / budget.total_income) * 100)
              : 0
            const overBudget = (budget.total_expense || 0) > budget.total_income

            return (
              <Link key={budget.id} href={`/admin/finance/budgets/${budget.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold leading-tight">{isAr ? budget.name_ar || budget.name : budget.name}</p>
                        {budget.name_ar && !isAr && <p className="text-sm text-muted-foreground" dir="rtl">{budget.name_ar}</p>}
                      </div>
                      <Badge variant={budget.is_active ? 'default' : 'secondary'} className="shrink-0">
                        {t(budget.period_type)}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {budget.start_date} → {budget.end_date || t('ongoing')}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('actual')}</span>
                        <span className={overBudget ? 'text-red-600 font-medium' : 'font-medium'}>
                          <span className="tabular-nums" dir="ltr">{fmt(budget.total_expense || 0, budget.currency || 'USD', locale)}</span>
                          {' '}<span className="text-muted-foreground font-normal">/ <span className="tabular-nums" dir="ltr">{fmt(budget.total_income, budget.currency || 'USD', locale)}</span></span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : usedPct > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, usedPct)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-end">{usedPct.toFixed(0)}% {t('used')}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
