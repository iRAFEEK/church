import { z } from 'zod'

const positiveFiniteAmount = z
  .number()
  .min(0, 'Amount cannot be negative')
  .finite('Amount must be finite')
  .max(10_000_000_000, 'Amount too large')

const LineItemSchema = z.object({
  account_id: z.string().uuid(),
  debit_amount: positiveFiniteAmount.default(0),
  credit_amount: positiveFiniteAmount.default(0),
  description: z.string().max(500).optional().nullable(),
  fund_id: z.string().uuid().optional().nullable(),
})

export const CreateTransactionSchema = z.object({
  transaction_date: z.string().min(1, 'Transaction date is required'),
  description: z.string().min(1).max(500),
  memo: z.string().max(2000).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  total_amount: positiveFiniteAmount.optional(),
  currency: z.string().min(1).max(10).default('EGP'),
  fund_id: z.string().uuid().optional().nullable(),
  line_items: z.array(LineItemSchema).min(1, 'At least one line item is required'),
})

export const UpdateTransactionSchema = z.object({
  transaction_date: z.string().optional(),
  description: z.string().min(1).max(500).optional(),
  memo: z.string().max(2000).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  status: z.enum(['draft', 'pending', 'posted', 'void']).optional(),
  line_items: z.array(LineItemSchema).min(1).optional(),
})
