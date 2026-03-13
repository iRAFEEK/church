import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateExpenseSchema } from '@/lib/schemas/expense'

// GET /api/finance/expenses
export const GET = apiHandler(async ({ req, supabase, user, profile, resolvedPermissions }) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const status = searchParams.get('status')
  const ministryId = searchParams.get('ministry_id')
  const mine = searchParams.get('mine') === 'true'

  let query = supabase
    .from('expense_requests')
    .select(`
      id, description, description_ar, amount, currency, status, vendor_name, vendor_name_ar, request_number, rejection_reason, payment_method, is_reimbursement, notes, created_at,
      requester:requested_by ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      ministry:ministry_id ( id, name, name_ar ),
      fund:fund_id ( id, name, name_ar )
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  // If user can only submit (not approve), show only their own
  if (!resolvedPermissions.can_approve_expenses || mine) {
    query = query.eq('requested_by', user.id)
  }

  if (status) query = query.eq('status', status)
  if (ministryId) query = query.eq('ministry_id', ministryId)

  const { data, error, count } = await query
  if (error) throw error

  return Response.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  })
}, { requirePermissions: ['can_submit_expenses'] })

// POST /api/finance/expenses — submit expense request
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateExpenseSchema, body)

  const { data, error } = await supabase
    .from('expense_requests')
    .insert({
      description: validated.description,
      description_ar: validated.description_ar,
      amount: validated.amount,
      currency: validated.currency,
      vendor_name: validated.vendor_name,
      vendor_name_ar: validated.vendor_name_ar,
      payment_method: validated.payment_method,
      is_reimbursement: validated.is_reimbursement,
      ministry_id: validated.ministry_id,
      fund_id: validated.fund_id,
      account_id: validated.account_id,
      receipt_url: validated.receipt_url,
      notes: validated.notes,
      church_id: profile.church_id,
      requested_by: user.id,
      status: 'submitted',
    })
    .select(`
      id, description, description_ar, amount, currency, status, vendor_name, vendor_name_ar, request_number, payment_method, is_reimbursement, notes, created_at,
      requester:requested_by ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      ministry:ministry_id ( id, name, name_ar )
    `)
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_submit_expenses'] })
