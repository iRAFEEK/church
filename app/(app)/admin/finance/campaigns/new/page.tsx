import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CampaignForm } from './CampaignForm'

export default async function NewCampaignPage() {
  const { profile } = await requirePermission('can_manage_campaigns')
  const supabase = await createClient()

  const { data: funds } = await supabase
    .from('funds')
    .select('id, name, name_ar')
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .order('name')

  return <CampaignForm funds={funds || []} />
}
