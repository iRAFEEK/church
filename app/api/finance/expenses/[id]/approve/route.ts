import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'

// POST /api/finance/expenses/[id]/approve
export const POST = apiHandler(async ({ supabase, user, profile, params }) => {
  const id = params!.id

  // Fetch the expense to check self-approval
  const { data: expense, error: fetchError } = await supabase
    .from('expense_requests')
    .select('id, requested_by')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .eq('status', 'submitted')
    .single()

  if (error) {
    console.error('[/api/finance/expenses/[id]/approve POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_approve_expenses'] })
