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

  if (fetchError || !expense) {
    return Response.json({ error: 'Expense not found or not in submitted status' }, { status: 404 })
  }

  // Prevent self-approval
  if (expense.requested_by === profile.id) {
    return Response.json({ error: 'Cannot approve own expense' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('expense_requests')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .eq('status', 'submitted')
    .select('id, description, amount, currency, status, approved_by, approved_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_approve_expenses'] })
