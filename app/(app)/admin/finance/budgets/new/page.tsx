import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getCachedFunds } from '@/lib/cache/queries'
import { BudgetForm } from './BudgetForm'

export default async function NewBudgetPage() {
  const { profile } = await requirePermission('can_manage_budgets')
  const supabase = await createClient()

  const [funds, { data: fiscalYears }] = await Promise.all([
    getCachedFunds(profile.church_id),
    supabase
      .from('fiscal_years')
      .select('id, name, start_date, end_date, is_current')
      .eq('church_id', profile.church_id)
      .order('start_date', { ascending: false }),
  ])

  return <BudgetForm funds={funds || []} fiscalYears={fiscalYears || []} />
}
