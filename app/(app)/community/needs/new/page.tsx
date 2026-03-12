import { requirePermission } from '@/lib/auth'
import { NeedForm } from '@/components/community/NeedForm'

export default async function NewChurchNeedPage() {
  await requirePermission('can_manage_church_needs')

  return (
    <div className="p-6">
      <NeedForm />
    </div>
  )
}
