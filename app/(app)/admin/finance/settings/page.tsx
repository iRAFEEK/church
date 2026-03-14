import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './SettingsForm'

export default async function FinanceSettingsPage() {
  const { profile } = await requirePermission('can_manage_finances')
  const supabase = await createClient()

  const { data } = await supabase
    .from('churches')
    .select('default_currency, supported_currencies, fiscal_year_start_month, financial_approval_required, donation_receipt_enabled, online_giving_enabled')
    .eq('id', profile.church_id)
    .single()

  const initialData = {
    default_currency: data?.default_currency || 'USD',
    supported_currencies: data?.supported_currencies || ['USD'],
    fiscal_year_start_month: data?.fiscal_year_start_month || 1,
    financial_approval_required: data?.financial_approval_required ?? true,
    donation_receipt_enabled: data?.donation_receipt_enabled ?? true,
    online_giving_enabled: data?.online_giving_enabled ?? false,
  }

  return (
    <div className="pb-24">
      <SettingsForm initialData={initialData} />
    </div>
  )
}
