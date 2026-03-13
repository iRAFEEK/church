import { z } from 'zod'

export const CreateAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  account_type: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  account_sub_type: z.string().max(50).optional().nullable(),
  currency: z.string().min(1).max(10).default('EGP'),
  is_header: z.boolean().default(false),
  is_active: z.boolean().default(true),
  parent_id: z.string().uuid().optional().nullable(),
  display_order: z.number().int().min(0).max(9999).default(0),
})

export const UpdateAccountSchema = CreateAccountSchema.partial()
