import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'
import { validate } from '@/lib/api/validate'
import { RejectExpenseSchema } from '@/lib/schemas/expense'

// POST /api/finance/expenses/[id]/reject
export const POST = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(RejectExpenseSchema, body)

  const { data, error } = await supabase
    .from('expense_requests')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: validated.reason || null,
    })
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .eq('status', 'submitted')
    .select('id, description, amount, currency, status, rejection_reason, approved_by, approved_at')
    .single()

  if (error) {
    logger.error('[/api/finance/expenses/[id]/reject POST]', { module: 'finance', error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_approve_expenses'] })
