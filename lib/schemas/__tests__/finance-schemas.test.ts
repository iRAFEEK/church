import { describe, it, expect } from 'vitest'
import { CreateDonationSchema, UpdateDonationSchema } from '@/lib/schemas/donation'
import { CreateFundSchema, UpdateFundSchema } from '@/lib/schemas/fund'
import { CreateExpenseSchema, RejectExpenseSchema } from '@/lib/schemas/expense'
import { CreateAccountSchema, UpdateAccountSchema } from '@/lib/schemas/account'
import { CreateBudgetSchema, UpdateBudgetSchema } from '@/lib/schemas/budget'
import { CreateCampaignSchema, UpdateCampaignSchema } from '@/lib/schemas/campaign'
import { CreateFiscalYearSchema } from '@/lib/schemas/fiscal-year'
import { CreateTransactionSchema, UpdateTransactionSchema } from '@/lib/schemas/transaction'

describe('Finance Zod Schemas — Mass Assignment Prevention', () => {
  describe('CreateDonationSchema', () => {
    const validDonation = {
      amount: 100,
      donation_date: '2026-01-15',
    }

    it('accepts valid donation', () => {
      const result = CreateDonationSchema.safeParse(validDonation)
      expect(result.success).toBe(true)
    })

    it('strips unknown fields (mass assignment prevention)', () => {
      const result = CreateDonationSchema.safeParse({
        ...validDonation,
        church_id: 'attacker-church-id',
        created_by: 'attacker-user-id',
        id: 'attacker-id',
        base_amount: 999999,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('church_id')
        expect(result.data).not.toHaveProperty('created_by')
        expect(result.data).not.toHaveProperty('id')
        expect(result.data).not.toHaveProperty('base_amount')
      }
    })

    it('rejects negative amount', () => {
      const result = CreateDonationSchema.safeParse({ ...validDonation, amount: -100 })
      expect(result.success).toBe(false)
    })

    it('rejects infinite amount', () => {
      const result = CreateDonationSchema.safeParse({ ...validDonation, amount: Infinity })
      expect(result.success).toBe(false)
    })

    it('rejects amount exceeding max', () => {
      const result = CreateDonationSchema.safeParse({ ...validDonation, amount: 100_000_000 })
      expect(result.success).toBe(false)
    })

    it('defaults currency to EGP', () => {
      const result = CreateDonationSchema.safeParse(validDonation)
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.currency).toBe('EGP')
    })

    it('validates payment method enum', () => {
      const result = CreateDonationSchema.safeParse({ ...validDonation, payment_method: 'bitcoin' })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateDonationSchema (partial)', () => {
    it('accepts partial updates', () => {
      const result = UpdateDonationSchema.safeParse({ amount: 200 })
      expect(result.success).toBe(true)
    })

    it('strips unknown fields on update', () => {
      const result = UpdateDonationSchema.safeParse({
        amount: 200,
        church_id: 'attacker-church',
        id: 'override-id',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('church_id')
        expect(result.data).not.toHaveProperty('id')
      }
    })
  })

  describe('CreateFundSchema', () => {
    it('accepts valid fund', () => {
      const result = CreateFundSchema.safeParse({ name: 'General Fund' })
      expect(result.success).toBe(true)
    })

    it('strips church_id from input', () => {
      const result = CreateFundSchema.safeParse({
        name: 'Test',
        church_id: 'attacker-church',
        current_balance: 999999,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('church_id')
        expect(result.data).not.toHaveProperty('current_balance')
      }
    })

    it('rejects negative target amount', () => {
      const result = CreateFundSchema.safeParse({ name: 'Test', target_amount: -100 })
      expect(result.success).toBe(false)
    })
  })

  describe('CreateExpenseSchema', () => {
    it('accepts valid expense', () => {
      const result = CreateExpenseSchema.safeParse({ description: 'Office supplies', amount: 50 })
      expect(result.success).toBe(true)
    })

    it('strips status/requested_by/church_id', () => {
      const result = CreateExpenseSchema.safeParse({
        description: 'Test',
        amount: 50,
        status: 'approved',
        requested_by: 'attacker',
        church_id: 'attacker-church',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('status')
        expect(result.data).not.toHaveProperty('requested_by')
        expect(result.data).not.toHaveProperty('church_id')
      }
    })

    it('validates receipt URL format', () => {
      const result = CreateExpenseSchema.safeParse({
        description: 'Test',
        amount: 50,
        receipt_url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('CreateAccountSchema', () => {
    it('accepts valid account', () => {
      const result = CreateAccountSchema.safeParse({
        code: '1000',
        name: 'Cash',
        account_type: 'asset',
      })
      expect(result.success).toBe(true)
    })

    it('validates account_type enum', () => {
      const result = CreateAccountSchema.safeParse({
        code: '1000',
        name: 'Cash',
        account_type: 'invalid_type',
      })
      expect(result.success).toBe(false)
    })

    it('strips church_id', () => {
      const result = CreateAccountSchema.safeParse({
        code: '1000',
        name: 'Cash',
        account_type: 'asset',
        church_id: 'attacker',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).not.toHaveProperty('church_id')
    })
  })

  describe('CreateBudgetSchema', () => {
    it('accepts valid budget', () => {
      const result = CreateBudgetSchema.safeParse({
        name: 'Q1 Budget',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
      })
      expect(result.success).toBe(true)
    })

    it('strips church_id and created_by', () => {
      const result = CreateBudgetSchema.safeParse({
        name: 'Q1',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
        church_id: 'attacker',
        created_by: 'attacker',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('church_id')
        expect(result.data).not.toHaveProperty('created_by')
      }
    })
  })

  describe('CreateCampaignSchema', () => {
    it('accepts valid campaign', () => {
      const result = CreateCampaignSchema.safeParse({
        name: 'Building Fund',
        goal_amount: 50000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      })
      expect(result.success).toBe(true)
    })

    it('strips current_amount and church_id', () => {
      const result = CreateCampaignSchema.safeParse({
        name: 'Test',
        goal_amount: 1000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        current_amount: 999999,
        church_id: 'attacker',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('current_amount')
        expect(result.data).not.toHaveProperty('church_id')
      }
    })

    it('rejects negative goal', () => {
      const result = CreateCampaignSchema.safeParse({
        name: 'Test',
        goal_amount: -1000,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('CreateFiscalYearSchema', () => {
    it('accepts valid fiscal year', () => {
      const result = CreateFiscalYearSchema.safeParse({
        name: 'FY 2026',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      })
      expect(result.success).toBe(true)
    })

    it('rejects end_date before start_date', () => {
      const result = CreateFiscalYearSchema.safeParse({
        name: 'FY 2026',
        start_date: '2026-12-31',
        end_date: '2026-01-01',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('CreateTransactionSchema', () => {
    it('accepts valid transaction with balanced line items', () => {
      const result = CreateTransactionSchema.safeParse({
        transaction_date: '2026-01-15',
        description: 'Office rent',
        line_items: [
          { account_id: '550e8400-e29b-41d4-a716-446655440001', debit_amount: 1000, credit_amount: 0 },
          { account_id: '550e8400-e29b-41d4-a716-446655440002', debit_amount: 0, credit_amount: 1000 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('requires at least one line item', () => {
      const result = CreateTransactionSchema.safeParse({
        transaction_date: '2026-01-15',
        description: 'No items',
        line_items: [],
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative line item amounts', () => {
      const result = CreateTransactionSchema.safeParse({
        transaction_date: '2026-01-15',
        description: 'Test',
        line_items: [
          { account_id: '550e8400-e29b-41d4-a716-446655440001', debit_amount: -100, credit_amount: 0 },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('strips church_id and created_by from transaction input', () => {
      const result = CreateTransactionSchema.safeParse({
        transaction_date: '2026-01-15',
        description: 'Test',
        church_id: 'attacker',
        created_by: 'attacker',
        line_items: [
          { account_id: '550e8400-e29b-41d4-a716-446655440001', debit_amount: 100, credit_amount: 0 },
        ],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('church_id')
        expect(result.data).not.toHaveProperty('created_by')
      }
    })
  })

  describe('UpdateTransactionSchema', () => {
    it('validates status enum', () => {
      const result = UpdateTransactionSchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('accepts valid status values', () => {
      for (const status of ['draft', 'pending', 'posted', 'void']) {
        const result = UpdateTransactionSchema.safeParse({ status })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('RejectExpenseSchema', () => {
    it('accepts optional reason', () => {
      const result = RejectExpenseSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('validates reason length', () => {
      const result = RejectExpenseSchema.safeParse({ reason: 'a'.repeat(1001) })
      expect(result.success).toBe(false)
    })
  })
})

describe('Finance Routes — apiHandler + church_id verification', () => {
  // These tests verify that all finance routes use apiHandler (not manual auth)
  // and use explicit field insertion (not raw body spread)

  const routeFiles = [
    'app/api/finance/donations/route.ts',
    'app/api/finance/donations/[id]/route.ts',
    'app/api/finance/funds/route.ts',
    'app/api/finance/funds/[id]/route.ts',
    'app/api/finance/expenses/route.ts',
    'app/api/finance/expenses/[id]/approve/route.ts',
    'app/api/finance/expenses/[id]/reject/route.ts',
    'app/api/finance/budgets/route.ts',
    'app/api/finance/budgets/[id]/route.ts',
    'app/api/finance/campaigns/route.ts',
    'app/api/finance/campaigns/[id]/route.ts',
    'app/api/finance/accounts/route.ts',
    'app/api/finance/fiscal-years/route.ts',
    'app/api/finance/transactions/route.ts',
  ]

  for (const file of routeFiles) {
    it(`${file} uses apiHandler`, async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).toContain('apiHandler')
      expect(content).not.toContain('new NextResponse')
      // Must not have manual auth patterns
      expect(content).not.toMatch(/supabase\.auth\.getUser\(\)/)
    })

    it(`${file} does not spread raw body into insert/update`, async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(file, 'utf-8')
      // Should not have .insert(body) or .update(body) — only .insert({...explicit fields}) or .update(updateData)
      expect(content).not.toMatch(/\.insert\(body\)/)
      expect(content).not.toMatch(/\.update\(body\)/)
      // Should not have spread of body: ...body or ...validated (into insert)
      expect(content).not.toMatch(/\.insert\(\{[\s\S]*?\.\.\.body/)
    })
  }
})
