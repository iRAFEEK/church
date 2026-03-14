import { z } from 'zod'

export const JoinChurchSchema = z.object({
  church_id: z.string().uuid('Invalid church ID'),
})

export const SwitchChurchSchema = z.object({
  church_id: z.string().uuid('Invalid church ID'),
})

export const RegisterLeaderSchema = z.object({
  email: z.string().email('Valid email is required'),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  first_name_ar: z.string().max(100).optional().nullable(),
  last_name_ar: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
})

export const UpdateChurchSettingsSchema = z.object({
  default_currency: z.string().min(1).max(10).optional(),
  supported_currencies: z.array(z.string().min(1).max(10)).optional(),
  fiscal_year_start_month: z.number().int().min(1).max(12).optional(),
  financial_approval_required: z.boolean().optional(),
  donation_receipt_enabled: z.boolean().optional(),
  online_giving_enabled: z.boolean().optional(),
})
