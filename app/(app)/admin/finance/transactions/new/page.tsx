import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from './TransactionForm'

export default async function NewTransactionPage() {
  const { profile } = await requirePermission('can_manage_finances')
  const supabase = await createClient()

  const [accountsResult, fundsResult] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, code, name, name_ar, is_header')
      .eq('church_id', profile.church_id)
      .eq('is_header', false)
      .order('code'),
    supabase
      .from('funds')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <TransactionForm
      accounts={accountsResult.data || []}
      funds={fundsResult.data || []}
    />
  )
}
