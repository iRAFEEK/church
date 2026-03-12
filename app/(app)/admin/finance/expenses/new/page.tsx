import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ExpenseForm } from './ExpenseForm'

export default async function NewExpensePage() {
  const { profile } = await requirePermission('can_submit_expenses')
  const supabase = await createClient()

  const [{ data: ministries }, { data: funds }] = await Promise.all([
    supabase
      .from('ministries')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('funds')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .order('name'),
  ])

  return <ExpenseForm ministries={ministries || []} funds={funds || []} />
}
