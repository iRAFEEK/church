import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const txnIdRouteCode = readFileSync('app/api/finance/transactions/[id]/route.ts', 'utf-8')
const schemaCode = readFileSync('lib/schemas/transaction.ts', 'utf-8')

describe('Transaction [id] PATCH — double-entry balance validation', () => {
  it('should use apiHandler instead of manual auth', () => {
    expect(txnIdRouteCode).toContain('apiHandler')
    expect(txnIdRouteCode).not.toContain('supabase.auth.getUser()')
  })

  it('should filter by church_id on all queries', () => {
    const churchIdCount = (txnIdRouteCode.match(/eq\('church_id', profile\.church_id\)/g) || []).length
    expect(churchIdCount).toBeGreaterThanOrEqual(3) // GET + PATCH header + PATCH line items
  })

  it('PATCH should validate body with Zod schema', () => {
    expect(txnIdRouteCode).toContain('validate(UpdateTransactionSchema')
  })

  it('PATCH should re-validate double-entry balance when line_items are updated', () => {
    expect(txnIdRouteCode).toContain('totalDebits')
    expect(txnIdRouteCode).toContain('totalCredits')
    expect(txnIdRouteCode).toContain('Math.abs(totalDebits - totalCredits)')
    expect(txnIdRouteCode).toContain("'Transaction is not balanced'")
    expect(txnIdRouteCode).toContain('status: 422')
  })

  it('PATCH should return debits and credits in error details', () => {
    expect(txnIdRouteCode).toContain('details: { debits: totalDebits, credits: totalCredits }')
  })

  it('should use epsilon comparison (0.01) not exact equality', () => {
    expect(txnIdRouteCode).toContain('0.01')
  })

  it('should not leak error.message to client', () => {
    expect(txnIdRouteCode).not.toContain('error.message')
  })

  it('should require can_manage_finances permission for PATCH', () => {
    expect(txnIdRouteCode).toContain("'can_manage_finances'")
  })

  it('should require can_view_finances permission for GET', () => {
    expect(txnIdRouteCode).toContain("'can_view_finances'")
  })

  it('should not use raw body in .update()', () => {
    expect(txnIdRouteCode).not.toContain('.update(await req.json())')
  })
})

describe('Transaction Zod schema', () => {
  it('should validate line item amounts are non-negative', () => {
    expect(schemaCode).toContain(".min(0, 'Amount cannot be negative')")
  })

  it('should require at least 1 line item on create', () => {
    expect(schemaCode).toContain(".min(1, 'At least one line item is required')")
  })

  it('should validate amount is finite (no NaN/Infinity)', () => {
    expect(schemaCode).toContain(".finite('Amount must be finite')")
  })

  it('should validate account_id is UUID', () => {
    expect(schemaCode).toContain('z.string().uuid()')
  })

  it('should limit status to valid values', () => {
    expect(schemaCode).toContain("'draft'")
    expect(schemaCode).toContain("'posted'")
    expect(schemaCode).toContain("'void'")
  })
})
