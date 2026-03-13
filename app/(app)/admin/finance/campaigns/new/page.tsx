import { requirePermission } from '@/lib/auth'
import { getCachedFunds } from '@/lib/cache/queries'
import { CampaignForm } from './CampaignForm'

export default async function NewCampaignPage() {
  const { profile } = await requirePermission('can_manage_campaigns')

  const funds = await getCachedFunds(profile.church_id)

  return <CampaignForm funds={funds || []} />
}
