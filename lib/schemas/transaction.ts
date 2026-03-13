import { z } from 'zod'

const LineItemSchema = z.object({
  account_id: z.string().uuid(),
  fund_id: z.string().uuid().optional().nullable(),
  debit_amount: z.number().min(0).finite().default(0),
  credit_amount: z.number().min(0).finite().default(0),
  description: z.string().max(500).optional().nullable(),
})

export const CreateTransactionSchema = z.object({
  transaction_date: z.string().min(1, 'Transaction date is required'),
  description: z.string().min(1).max(500),
  memo: z.string().max(2000).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  currency: z.string().max(10).default('EGP'),
  total_amount: z.number().positive().max(100_000_000).finite().optional(),
  line_items: z.array(LineItemSchema).min(1, 'At least one line item required'),
})

export const UpdateTransactionSchema = z.object({
  transaction_date: z.string().optional(),
  description: z.string().min(1).max(500).optional(),
  memo: z.string().max(2000).optional().nullable(),
  reference_number: z.string().max(100).optional().nullable(),
  status: z.enum(['draft', 'pending', 'posted', 'void']).optional(),
  line_items: z.array(LineItemSchema).min(1).optional(),
})

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>
