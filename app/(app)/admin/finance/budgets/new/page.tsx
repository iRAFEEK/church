import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { BudgetForm } from './BudgetForm'

export default async function NewBudgetPage() {
  const { profile } = await requirePermission('can_manage_budgets')
  const supabase = await createClient()

  const [{ data: funds }, { data: fiscalYears }] = await Promise.all([
    supabase
      .from('funds')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('fiscal_years')
      .select('id, name, start_date, end_date, is_current')
      .eq('church_id', profile.church_id)
      .order('start_date', { ascending: false }),
  ])

  return <BudgetForm funds={funds || []} fiscalYears={fiscalYears || []} />
}
