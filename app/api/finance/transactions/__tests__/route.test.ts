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
    // PATCH now uses atomic RPC which receives church_id as parameter
    // GET still filters directly
    expect(txnIdRouteCode).toContain('church_id')
    expect(txnIdRouteCode).toContain('profile.church_id')
  })

  it('PATCH should validate body with Zod schema', () => {
    expect(txnIdRouteCode).toContain('validate(UpdateTransactionSchema')
  })

  it('PATCH uses atomic RPC for balance validation and line item replacement', () => {
    // ARCH-6 fix: balance validation + line item atomicity moved to Postgres RPC
    expect(txnIdRouteCode).toContain('update_transaction_with_items')
    expect(txnIdRouteCode).toContain('rpc')
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
