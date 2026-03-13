import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateBudgetSchema } from '@/lib/schemas/budget'

// GET /api/finance/budgets
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const fiscalYearId = searchParams.get('fiscal_year_id')
  const fundId = searchParams.get('fund_id')
  const ministryId = searchParams.get('ministry_id')

  let query = supabase
    .from('budgets')
    .select(`
      id, name, name_ar, period_type, start_date, end_date, total_income, total_expense, is_active, is_approved, currency, created_at,
      fiscal_year:fiscal_year_id (id, name, name_ar),
      fund:fund_id (id, name, name_ar),
      ministry:ministry_id (id, name, name_ar)
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (fiscalYearId) query = query.eq('fiscal_year_id', fiscalYearId)
  if (fundId) query = query.eq('fund_id', fundId)
  if (ministryId) query = query.eq('ministry_id', ministryId)

  const { data, error, count } = await query
  if (error) throw error

  return Response.json({ data, count }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/budgets
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateBudgetSchema, body)

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      name: validated.name,
      name_ar: validated.name_ar,
      period_type: validated.period_type,
      start_date: validated.start_date,
      end_date: validated.end_date,
      total_income: validated.total_income,
      total_expense: validated.total_expense,
      currency: validated.currency,
      fiscal_year_id: validated.fiscal_year_id,
      fund_id: validated.fund_id,
      ministry_id: validated.ministry_id,
      is_active: validated.is_active,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select('id, name, name_ar, period_type, start_date, end_date, total_income, total_expense, is_active, currency, created_at')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_budgets'] })
