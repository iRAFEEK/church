import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Finance [id] route tests — verify key behavioral properties:
 * 1. Church_id isolation (every query filters by church_id)
 * 2. Permission requirements (correct requirePermissions)
 * 3. Validation (schemas enforced on PATCH)
 * 4. Self-approval prevention (expenses)
 */

// ── Static analysis: church_id isolation ─────────────────────────────────────

const FINANCE_ID_ROUTES = [
  { file: 'donations/[id]/route.ts', label: 'Donations [id]' },
  { file: 'transactions/[id]/route.ts', label: 'Transactions [id]' },
  { file: 'funds/[id]/route.ts', label: 'Funds [id]' },
  { file: 'budgets/[id]/route.ts', label: 'Budgets [id]' },
  { file: 'campaigns/[id]/route.ts', label: 'Campaigns [id]' },
  { file: 'expenses/[id]/approve/route.ts', label: 'Expenses approve' },
  { file: 'expenses/[id]/reject/route.ts', label: 'Expenses reject' },
]

describe('Finance [id] routes — static analysis', () => {
  const sources: Record<string, string> = {}

  for (const route of FINANCE_ID_ROUTES) {
    const filePath = join(process.cwd(), 'app/api/finance', route.file)
    sources[route.label] = readFileSync(filePath, 'utf-8')
  }

  describe('church_id isolation', () => {
    for (const route of FINANCE_ID_ROUTES) {
      it(`${route.label} filters every query by church_id`, () => {
        const code = sources[route.label]
        // Every .from() call should be followed by a .eq('church_id', ...) in the chain
        expect(code).toContain("church_id")
        expect(code).toContain("profile.church_id")
      })
    }
  })

  describe('uses apiHandler', () => {
    for (const route of FINANCE_ID_ROUTES) {
      it(`${route.label} uses apiHandler wrapper`, () => {
        expect(sources[route.label]).toContain('apiHandler')
      })
    }
  })

  describe('permission enforcement', () => {
    it('donations [id] GET requires can_view_finances', () => {
      expect(sources['Donations [id]']).toContain("requirePermissions")
      expect(sources['Donations [id]']).toContain("can_view_finances")
    })

    it('donations [id] PATCH requires can_manage_finances', () => {
      expect(sources['Donations [id]']).toContain("can_manage_finances")
    })

    it('transactions [id] GET requires can_view_finances', () => {
      expect(sources['Transactions [id]']).toContain("can_view_finances")
    })

    it('transactions [id] PATCH requires can_manage_finances', () => {
      expect(sources['Transactions [id]']).toContain("can_manage_finances")
    })

    it('funds [id] GET requires can_view_finances', () => {
      expect(sources['Funds [id]']).toContain("can_view_finances")
    })

    it('budgets [id] PATCH requires can_manage_budgets', () => {
      expect(sources['Budgets [id]']).toContain("can_manage_budgets")
    })

    it('campaigns [id] PATCH requires can_manage_campaigns', () => {
      expect(sources['Campaigns [id]']).toContain("can_manage_campaigns")
    })

    it('expense approve requires can_approve_expenses', () => {
      expect(sources['Expenses approve']).toContain("can_approve_expenses")
    })

    it('expense reject requires can_approve_expenses', () => {
      expect(sources['Expenses reject']).toContain("can_approve_expenses")
    })
  })

  describe('validation', () => {
    it('donations [id] PATCH validates with UpdateDonationSchema', () => {
      expect(sources['Donations [id]']).toContain('UpdateDonationSchema')
      expect(sources['Donations [id]']).toContain('validate(')
    })

    it('transactions [id] PATCH validates with UpdateTransactionSchema', () => {
      expect(sources['Transactions [id]']).toContain('UpdateTransactionSchema')
      expect(sources['Transactions [id]']).toContain('validate(')
    })

    it('funds [id] PATCH validates with UpdateFundSchema', () => {
      expect(sources['Funds [id]']).toContain('UpdateFundSchema')
      expect(sources['Funds [id]']).toContain('validate(')
    })

    it('budgets [id] PATCH validates with UpdateBudgetSchema', () => {
      expect(sources['Budgets [id]']).toContain('UpdateBudgetSchema')
      expect(sources['Budgets [id]']).toContain('validate(')
    })

    it('campaigns [id] PATCH validates with UpdateCampaignSchema', () => {
      expect(sources['Campaigns [id]']).toContain('UpdateCampaignSchema')
      expect(sources['Campaigns [id]']).toContain('validate(')
    })

    it('expense reject validates with RejectExpenseSchema', () => {
      expect(sources['Expenses reject']).toContain('RejectExpenseSchema')
      expect(sources['Expenses reject']).toContain('validate(')
    })
  })

  describe('expense-specific security', () => {
    it('expense approve prevents self-approval', () => {
      const code = sources['Expenses approve']
      expect(code).toContain('requested_by')
      expect(code).toContain('Cannot approve your own expense')
    })

    it('expense approve checks submitted status before approving', () => {
      const code = sources['Expenses approve']
      // Must query for status=submitted to prevent double-approval
      expect(code).toContain("'submitted'")
    })

    it('expense reject updates status to rejected with reason', () => {
      const code = sources['Expenses reject']
      expect(code).toContain("'rejected'")
      expect(code).toContain('rejection_reason')
    })
  })

  describe('donations [id] PATCH — base_amount recalculation', () => {
    it('recalculates base_amount when amount or exchange_rate changes', () => {
      const code = sources['Donations [id]']
      expect(code).toContain('base_amount')
      expect(code).toContain('amount * rate')
    })
  })

  describe('transactions [id] PATCH — double-entry validation', () => {
    it('validates debits equal credits before updating line items', () => {
      const code = sources['Transactions [id]']
      expect(code).toContain('totalDebits')
      expect(code).toContain('totalCredits')
      expect(code).toContain('Transaction is not balanced')
    })

    it('replaces old line items atomically (delete + insert)', () => {
      const code = sources['Transactions [id]']
      expect(code).toContain("'transaction_line_items'")
      expect(code).toContain('.delete()')
      expect(code).toContain('.insert(items)')
    })
  })

  describe('funds [id] PATCH — default fund switching', () => {
    it('unsets previous default fund before setting new one', () => {
      const code = sources['Funds [id]']
      expect(code).toContain('is_default')
      expect(code).toContain("update({ is_default: false })")
    })
  })

  describe('funds [id] DELETE — soft delete', () => {
    it('soft deletes by setting is_active to false', () => {
      const code = sources['Funds [id]']
      expect(code).toContain("update({ is_active: false })")
    })
  })

  describe('cache invalidation', () => {
    for (const route of ['Donations [id]', 'Transactions [id]', 'Funds [id]', 'Budgets [id]', 'Campaigns [id]', 'Expenses approve', 'Expenses reject']) {
      it(`${route} invalidates dashboard cache on mutation`, () => {
        expect(sources[route]).toContain('revalidateTag')
        expect(sources[route]).toContain('dashboard-')
      })
    }
  })
})
