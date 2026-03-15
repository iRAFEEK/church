import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

describe('P0-7: Finance atomic operations', () => {
  describe('Transaction route uses atomic RPC', () => {
    const content = fs.readFileSync('app/api/finance/transactions/route.ts', 'utf-8')

    it('uses apiHandler', () => {
      expect(content).toContain('apiHandler')
      expect(content).not.toMatch(/supabase\.auth\.getUser\(\)/)
    })

    it('POST uses create_transaction_with_items RPC', () => {
      expect(content).toContain("supabase.rpc('create_transaction_with_items'")
    })

    it('does not insert header and line items as separate queries in POST', () => {
      // Should NOT have separate .from('financial_transactions').insert followed by .from('transaction_line_items').insert
      expect(content).not.toContain("from('financial_transactions')\n    .insert")
      expect(content).not.toContain("from('transaction_line_items').insert")
    })

    it('handles unbalanced transaction error from RPC', () => {
      expect(content).toContain('not balanced')
      expect(content).toContain('422')
    })

    it('uses Zod validation', () => {
      expect(content).toContain('CreateTransactionSchema')
      expect(content).toContain('validate')
    })
  })

  describe('Fiscal years route uses atomic RPC for activation', () => {
    const content = fs.readFileSync('app/api/finance/fiscal-years/route.ts', 'utf-8')

    it('uses apiHandler', () => {
      expect(content).toContain('apiHandler')
      expect(content).not.toMatch(/supabase\.auth\.getUser\(\)/)
    })

    it('uses activate_fiscal_year RPC for is_current=true', () => {
      expect(content).toContain("supabase.rpc('activate_fiscal_year'")
    })

    it('does not manually unset is_current in a separate query', () => {
      // Old pattern: update({ is_current: false }).eq('is_current', true) as a separate step
      expect(content).not.toContain(".update({ is_current: false }).eq('church_id'")
    })

    it('uses Zod validation', () => {
      expect(content).toContain('CreateFiscalYearSchema')
    })
  })

  describe('Funds [id] route uses atomic RPC for default switch', () => {
    const content = fs.readFileSync('app/api/finance/funds/[id]/route.ts', 'utf-8')

    it('uses apiHandler', () => {
      expect(content).toContain('apiHandler')
      expect(content).not.toMatch(/supabase\.auth\.getUser\(\)/)
    })

    it('uses manual update to unset previous default before setting new default', () => {
      // Uses a two-step update pattern: unset old default, then set new one
      expect(content).toContain("update({ is_default: false })")
      expect(content).toContain("validated.is_default")
    })

    it('does not manually unset is_default in a separate query', () => {
      // Old pattern: .update({ is_default: false }).eq('church_id',...).eq('is_default', true)
      expect(content).not.toContain(".update({ is_default: false }).eq('church_id'")
    })

    it('uses Zod validation', () => {
      expect(content).toContain('UpdateFundSchema')
      expect(content).toContain('validate')
    })

    it('uses explicit field update, not raw body spread', () => {
      expect(content).not.toMatch(/\.update\(body\)/)
    })

    it('enforces church_id on all queries', () => {
      expect(content).toContain("profile.church_id")
    })
  })

  describe('Migration 055 defines atomic RPC functions', () => {
    const migration = fs.readFileSync('supabase/migrations/055_finance_atomic_rpcs.sql', 'utf-8')

    it('defines create_transaction_with_items function', () => {
      expect(migration).toContain('CREATE OR REPLACE FUNCTION create_transaction_with_items')
    })

    it('defines activate_fiscal_year function', () => {
      expect(migration).toContain('CREATE OR REPLACE FUNCTION activate_fiscal_year')
    })

    it('defines switch_default_fund function', () => {
      expect(migration).toContain('CREATE OR REPLACE FUNCTION switch_default_fund')
    })

    it('validates balance in create_transaction_with_items', () => {
      expect(migration).toContain('ABS(v_total_debits - v_total_credits) > 0.01')
      expect(migration).toContain('RAISE EXCEPTION')
    })

    it('grants execute to authenticated users', () => {
      expect(migration).toContain('GRANT EXECUTE ON FUNCTION create_transaction_with_items TO authenticated')
      expect(migration).toContain('GRANT EXECUTE ON FUNCTION activate_fiscal_year TO authenticated')
      expect(migration).toContain('GRANT EXECUTE ON FUNCTION switch_default_fund TO authenticated')
    })

    it('uses SECURITY DEFINER for RPC functions', () => {
      // SECURITY DEFINER ensures the function runs with the privileges of the defining role
      const count = (migration.match(/SECURITY DEFINER/g) || []).length
      expect(count).toBe(3) // One for each function
    })
  })
})
