import { requirePermission } from '@/lib/auth'
import { getCachedMinistries, getCachedFunds } from '@/lib/cache/queries'
import { ExpenseForm } from './ExpenseForm'

export default async function NewExpensePage() {
  const { profile } = await requirePermission('can_submit_expenses')

  const [ministries, funds] = await Promise.all([
    getCachedMinistries(profile.church_id),
    getCachedFunds(profile.church_id),
  ])

  return <ExpenseForm ministries={ministries || []} funds={funds || []} />
}
