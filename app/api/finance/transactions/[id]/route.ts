import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateTransactionSchema } from '@/lib/schemas/transaction'

// GET /api/finance/transactions/[id] — get transaction with line items
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('id, church_id, fiscal_year_id, transaction_number, transaction_date, description, description_ar, reference, status, total_amount, currency, fund_id, bank_account_id, ministry_id, event_id, batch_id, donor_id, payment_method, check_number, submitted_by, created_at, line_items:transaction_line_items(id, transaction_id, account_id, fund_id, description, debit_amount, credit_amount, currency, sort_order, account:accounts(code, name))')
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    console.error('[/api/finance/transactions/[id] GET]', error)
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// PATCH /api/finance/transactions/[id] — update transaction
// Re-validates double-entry balance after line item changes
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const body = validate(UpdateTransactionSchema, await req.json())
  const txnId = params!.id

  // If line_items are being updated, re-validate double-entry balance
  if (body.line_items && body.line_items.length > 0) {
    const totalDebits = body.line_items.reduce((sum, li) => sum + (li.debit_amount ?? 0), 0)
    const totalCredits = body.line_items.reduce((sum, li) => sum + (li.credit_amount ?? 0), 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return Response.json(
        {
          error: 'Transaction is not balanced',
          details: { debits: totalDebits, credits: totalCredits },
        },
        { status: 422 }
      )
    }

    // Delete old line items and insert new ones
    const { error: deleteError } = await supabase
      .from('transaction_line_items')
      .delete()
      .eq('transaction_id', txnId)
      .eq('church_id', profile.church_id)

    if (deleteError) throw deleteError

    const items = body.line_items.map(li => ({
      ...li,
      transaction_id: txnId,
      church_id: profile.church_id,
    }))

    const { error: insertError } = await supabase
      .from('transaction_line_items')
      .insert(items)

    if (insertError) throw insertError
  }

  // Update transaction header (exclude line_items from header update)
  const { line_items: _lineItems, ...headerUpdates } = body

  if (Object.keys(headerUpdates).length > 0) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .update(headerUpdates)
      .eq('id', txnId)
      .eq('church_id', profile.church_id)
      .select('id, reference_number, transaction_date, description, memo, status, total_amount, currency')
      .single()

    if (error || !data) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    revalidateTag(`dashboard-${profile.church_id}`)
    return Response.json({ data })
  }

  // If only line items were updated, re-fetch the full transaction
  const { data: refreshed, error: refreshError } = await supabase
    .from('financial_transactions')
    .select('id, reference_number, transaction_date, description, memo, status, total_amount, currency')
    .eq('id', txnId)
    .eq('church_id', profile.church_id)
    .single()

  if (refreshError) {
    console.error('[/api/finance/transactions/[id] PATCH]', refreshError)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data: refreshed })
}, { requirePermissions: ['can_manage_finances'] })
