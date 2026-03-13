import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateTransactionSchema } from '@/lib/schemas/transaction'

// GET /api/finance/transactions
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const fund_id = searchParams.get('fund_id')
  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = (page - 1) * limit

  let query = supabase
    .from('financial_transactions')
    .select('id, reference_number, transaction_date, description, memo, status, total_amount, currency, created_at, created_by_profile:profiles!created_by(full_name)', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (fund_id) query = query.eq('fund_id', fund_id)
  if (date_from) query = query.gte('transaction_date', date_from)
  if (date_to) query = query.lte('transaction_date', date_to)

  const { data, error, count } = await query
  if (error) throw error
  return Response.json({ data, count, page, limit }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/transactions
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateTransactionSchema, body)

  // Validate balanced journal entry
  const totalDebits = validated.line_items.reduce((s, l) => s + (l.debit_amount || 0), 0)
  const totalCredits = validated.line_items.reduce((s, l) => s + (l.credit_amount || 0), 0)
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return Response.json({ error: 'Journal entry must be balanced (debits = credits)' }, { status: 422 })
  }

  const { data: txn, error: txnError } = await supabase
    .from('financial_transactions')
    .insert({
      transaction_date: validated.transaction_date,
      description: validated.description,
      memo: validated.memo,
      reference_number: validated.reference_number,
      total_amount: validated.total_amount ?? totalDebits,
      currency: validated.currency,
      fund_id: validated.fund_id,
      church_id: profile.church_id,
      created_by: user.id,
      status: 'draft',
    })
    .select('id, reference_number, transaction_date, description, memo, status, total_amount, currency, created_at')
    .single()

  if (txnError) throw txnError

  const items = validated.line_items.map((l) => ({
    account_id: l.account_id,
    debit_amount: l.debit_amount,
    credit_amount: l.credit_amount,
    description: l.description,
    fund_id: l.fund_id,
    transaction_id: txn.id,
    church_id: profile.church_id,
  }))
  const { error: lineError } = await supabase.from('transaction_line_items').insert(items)
  if (lineError) throw lineError

  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data: txn }, { status: 201 })
}, { requirePermissions: ['can_manage_finances'] })
