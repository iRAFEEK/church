import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateTransactionSchema } from '@/lib/schemas/transaction'

// GET /api/finance/transactions
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const fundId = searchParams.get('fund_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('financial_transactions')
    .select('id, reference_number, transaction_date, description, memo, status, total_amount, currency, created_at', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (fundId) query = query.eq('fund_id', fundId)
  if (dateFrom) query = query.gte('transaction_date', dateFrom)
  if (dateTo) query = query.lte('transaction_date', dateTo)

  const { data, error, count } = await query
  if (error) {
    console.error('[/api/finance/transactions GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data, count, page, limit }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/transactions — atomic creation with line items via RPC
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateTransactionSchema, body)

  // Use atomic RPC function — header + line items in one DB transaction
  const { data, error } = await supabase.rpc('create_transaction_with_items', {
    p_church_id: profile.church_id,
    p_created_by: user.id,
    p_transaction_date: validated.transaction_date,
    p_description: validated.description,
    p_memo: validated.memo ?? null,
    p_reference_number: validated.reference_number ?? null,
    p_total_amount: validated.total_amount ?? null,
    p_currency: validated.currency,
    p_fund_id: validated.fund_id ?? null,
    p_line_items: JSON.stringify(validated.line_items),
  })

  if (error) {
    // RPC raises exception for unbalanced transactions
    if (error.message.includes('not balanced')) {
      return Response.json({ error: 'Transaction is not balanced: debits must equal credits' }, { status: 422 })
    }
    throw error
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

  if (txnError) {
    console.error('[/api/finance/transactions POST]', txnError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (line_items && line_items.length > 0) {
    const items = line_items.map((l: any) => ({
      ...l,
      transaction_id: txn.id,
      church_id: profile.church_id,
    }))
    const { error: lineError } = await supabase.from('transaction_line_items').insert(items)
    if (lineError) {
      console.error('[/api/finance/transactions POST]', lineError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_finances'] })
