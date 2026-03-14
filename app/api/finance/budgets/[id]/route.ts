import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'
import { validate } from '@/lib/api/validate'
import { UpdateBudgetSchema } from '@/lib/schemas/budget'

// GET /api/finance/budgets/[id]
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('budgets')
    .select('id, name, name_ar, period_type, start_date, end_date, total_income, total_expense, is_active, is_approved, currency, line_items:budget_line_items(id, account_id, budgeted_amount, actual_amount, notes, account:accounts(code, name, name_ar))')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    logger.error('[/api/finance/budgets/[id] GET]', { module: 'finance', error })
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// PATCH /api/finance/budgets/[id]
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(UpdateBudgetSchema, body)

  // Build explicit update object
  const updateData: Record<string, unknown> = {}
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.name_ar !== undefined) updateData.name_ar = validated.name_ar
  if (validated.period_type !== undefined) updateData.period_type = validated.period_type
  if (validated.start_date !== undefined) updateData.start_date = validated.start_date
  if (validated.end_date !== undefined) updateData.end_date = validated.end_date
  if (validated.total_income !== undefined) updateData.total_income = validated.total_income
  if (validated.total_expense !== undefined) updateData.total_expense = validated.total_expense
  if (validated.currency !== undefined) updateData.currency = validated.currency
  if (validated.fiscal_year_id !== undefined) updateData.fiscal_year_id = validated.fiscal_year_id
  if (validated.fund_id !== undefined) updateData.fund_id = validated.fund_id
  if (validated.ministry_id !== undefined) updateData.ministry_id = validated.ministry_id
  if (validated.is_active !== undefined) updateData.is_active = validated.is_active
  if (validated.is_approved !== undefined) updateData.is_approved = validated.is_approved

  const { data, error } = await supabase
    .from('budgets')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, name, name_ar, period_type, start_date, end_date, total_income, total_expense, is_active, is_approved, currency')
    .single()

  if (error) {
    logger.error('[/api/finance/budgets/[id] PATCH]', { module: 'finance', error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_budgets'] })
