import { requirePermission } from '@/lib/auth'
import { NeedForm } from '@/components/community/NeedForm'

export default async function NewChurchNeedPage() {
  await requirePermission('can_manage_church_needs')

  return (
    <div className="px-4 py-4 md:px-6 pb-24">
      <NeedForm />
    </div>
  )
}
