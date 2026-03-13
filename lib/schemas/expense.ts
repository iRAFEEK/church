import { z } from 'zod'

const positiveFiniteAmount = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be finite')
  .max(10_000_000, 'Amount cannot exceed 10,000,000')

export const CreateExpenseSchema = z.object({
  description: z.string().min(1).max(500),
  description_ar: z.string().max(500).optional().nullable(),
  amount: positiveFiniteAmount,
  currency: z.string().min(1).max(10).default('EGP'),
  vendor_name: z.string().max(200).optional().nullable(),
  vendor_name_ar: z.string().max(200).optional().nullable(),
  payment_method: z.enum(['cash', 'check', 'bank_transfer', 'online', 'mobile', 'other']).optional().nullable(),
  is_reimbursement: z.boolean().default(false),
  ministry_id: z.string().uuid().optional().nullable(),
  fund_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  receipt_url: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const RejectExpenseSchema = z.object({
  reason: z.string().max(1000).optional().nullable(),
})
