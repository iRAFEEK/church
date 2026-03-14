import { requirePermission } from '@/lib/auth'
import { getCachedAccounts, getCachedFunds } from '@/lib/cache/queries'
import { TransactionForm } from './TransactionForm'

export default async function NewTransactionPage() {
  const { profile } = await requirePermission('can_manage_finances')

  const [accounts, funds] = await Promise.all([
    getCachedAccounts(profile.church_id),
    getCachedFunds(profile.church_id),
  ])

  // Filter to postable accounts only (non-header)
  const postableAccounts = accounts.filter(a => !a.is_header)

  return (
    <div className="pb-24">
      <TransactionForm
        accounts={postableAccounts}
        funds={funds}
      />
    </div>
  )
}
