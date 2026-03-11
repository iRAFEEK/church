import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, BarChart3 } from 'lucide-react'

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

const PERIOD_LABEL: Record<string, string> = {
  annual: 'Annual', quarterly: 'Quarterly', monthly: 'Monthly', custom: 'Custom',
}

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_finances) redirect('/admin')

  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('church_id', profile.church_id)
    .order('start_date', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets / الميزانيات</h1>
          <p className="text-muted-foreground text-sm">{budgets?.length ?? 0} budgets</p>
        </div>
        {perms.can_manage_budgets && (
          <Button asChild>
            <Link href="/admin/finance/budgets/new">
              <Plus className="w-4 h-4 mr-2" />New Budget
            </Link>
          </Button>
        )}
      </div>

      {(!budgets || budgets.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No budgets yet. Create your first budget to start tracking planned vs. actual spending.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map(budget => {
            const usedPct = budget.total_amount > 0
              ? Math.min(100, ((budget.actual_amount || 0) / budget.total_amount) * 100)
              : 0
            const overBudget = (budget.actual_amount || 0) > budget.total_amount

            return (
              <Link key={budget.id} href={`/admin/finance/budgets/${budget.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold leading-tight">{budget.name}</p>
                        {budget.name_ar && <p className="text-sm text-muted-foreground" dir="rtl">{budget.name_ar}</p>}
                      </div>
                      <Badge variant={budget.is_active ? 'default' : 'secondary'} className="shrink-0">
                        {PERIOD_LABEL[budget.period_type] || budget.period_type}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {budget.start_date} → {budget.end_date || 'ongoing'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Actual</span>
                        <span className={overBudget ? 'text-red-600 font-medium' : 'font-medium'}>
                          {fmt(budget.actual_amount || 0, budget.currency || 'USD')}
                          {' '}<span className="text-muted-foreground font-normal">/ {fmt(budget.total_amount, budget.currency || 'USD')}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : usedPct > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, usedPct)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">{usedPct.toFixed(0)}% used</p>
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
