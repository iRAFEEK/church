import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import DonationForm from './DonationForm'

export default async function NewDonationPage() {
  const { profile } = await requirePermission('can_manage_donations')
  const supabase = await createClient()

  const [
    { data: funds },
    { data: campaigns },
    { data: members },
  ] = await Promise.all([
    supabase
      .from('funds')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('campaigns')
      .select('id, name, name_ar')
      .eq('church_id', profile.church_id)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, first_name_ar, last_name_ar')
      .eq('church_id', profile.church_id)
      .order('first_name')
      .limit(200),
  ])

  return (
    <DonationForm
      funds={funds || []}
      campaigns={campaigns || []}
      members={members || []}
    />
  )
}
