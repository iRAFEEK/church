import { z } from 'zod'

export const CreateFundSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  code: z.string().max(20).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  description_ar: z.string().max(2000).optional().nullable(),
  target_amount: z
    .number()
    .min(0, 'Target amount cannot be negative')
    .finite()
    .max(10_000_000_000)
    .optional()
    .nullable(),
  color: z.string().max(20).optional().nullable(),
  currency: z.string().min(1).max(10).default('EGP'),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  is_restricted: z.boolean().default(false),
  display_order: z.number().int().min(0).max(9999).default(0),
})

export const UpdateFundSchema = CreateFundSchema.partial()
