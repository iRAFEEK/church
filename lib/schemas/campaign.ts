import { z } from 'zod'

const positiveFiniteAmount = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be finite')
  .max(10_000_000_000, 'Amount too large')

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  description_ar: z.string().max(5000).optional().nullable(),
  goal_amount: positiveFiniteAmount,
  currency: z.string().min(1).max(10).default('EGP'),
  fund_id: z.string().uuid().optional().nullable(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  is_public: z.boolean().default(true),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).default('draft'),
  image_url: z.string().url().optional().nullable(),
}).refine(
  (data) => {
    if (data.end_date && data.start_date) {
      return new Date(data.end_date) > new Date(data.start_date)
    }
    return true
  },
  { message: 'End date must be after start date', path: ['end_date'] }
)

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  description_ar: z.string().max(5000).optional().nullable(),
  goal_amount: positiveFiniteAmount.optional(),
  currency: z.string().min(1).max(10).optional(),
  fund_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  is_public: z.boolean().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  image_url: z.string().url().optional().nullable(),
})
