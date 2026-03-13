import { z } from 'zod'

const finiteAmount = z
  .number()
  .finite('Amount must be finite')
  .min(0, 'Amount cannot be negative')
  .max(10_000_000_000, 'Amount too large')

export const CreateBudgetSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  period_type: z.enum(['monthly', 'quarterly', 'annual', 'custom']).default('annual'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  total_income: finiteAmount.default(0),
  total_expense: finiteAmount.default(0),
  currency: z.string().min(1).max(10).default('EGP'),
  fiscal_year_id: z.string().uuid().optional().nullable(),
  fund_id: z.string().uuid().optional().nullable(),
  ministry_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
)

export const UpdateBudgetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ar: z.string().max(200).optional().nullable(),
  period_type: z.enum(['monthly', 'quarterly', 'annual', 'custom']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  total_income: finiteAmount.optional(),
  total_expense: finiteAmount.optional(),
  currency: z.string().min(1).max(10).optional(),
  fiscal_year_id: z.string().uuid().optional().nullable(),
  fund_id: z.string().uuid().optional().nullable(),
  ministry_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  is_approved: z.boolean().optional(),
})
