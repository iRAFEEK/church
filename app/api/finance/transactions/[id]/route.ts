import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'
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
    logger.error('[/api/finance/transactions/[id] GET]', { module: 'finance', error })
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// PATCH /api/finance/transactions/[id] — update transaction
// Uses atomic RPC to prevent data loss if line item insert fails (ARCH-6)
// RPC also enforces posted/approved immutability check (ARCH-7)
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const body = validate(UpdateTransactionSchema, await req.json())
  const txnId = params!.id

  // Atomic RPC: header update + line item replacement in single DB transaction
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'update_transaction_with_items',
    {
      p_transaction_id: txnId,
      p_church_id: profile.church_id,
      p_description: body.description ?? null,
      p_transaction_date: body.transaction_date ?? null,
      p_reference_number: body.reference_number ?? null,
      p_memo: body.memo ?? null,
      p_status: body.status ?? null,
      p_items: body.line_items ? JSON.stringify(body.line_items) : null,
    }
  )

  if (rpcError) {
    // Balance validation errors surface as RAISE EXCEPTION from the RPC
    if (rpcError.message?.includes('does not balance')) {
      return Response.json(
        { error: 'Transaction is not balanced' },
        { status: 422 }
      )
    }
    logger.error('[/api/finance/transactions/[id] PATCH] RPC error', {
      module: 'finance',
      error: rpcError,
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  // RPC returns { error, status } for domain errors, { status, data } for success
  const result = rpcResult as Record<string, unknown>

  if (result.error === 'not_found') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (result.error === 'posted_transaction_immutable') {
    return Response.json(
      { error: 'Cannot modify a posted or approved transaction' },
      { status: 422 }
    )
  }

  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data: result.data })
}, { requirePermissions: ['can_manage_finances'] })
