import { z } from 'zod'

const LeaderEntrySchema = z.object({
  name: z.string().max(200).trim().optional().default(''),
  nameAr: z.string().max(200).trim().optional().default(''),
  title: z.string().max(200).trim().optional().default(''),
  titleAr: z.string().max(200).trim().optional().default(''),
})

export const ChurchRegistrationSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  churchNameAr: z.string().min(2).max(200).trim(),
  churchNameEn: z.string().max(200).trim().optional(),
  country: z.string().min(2).max(100).trim(),
  timezone: z.string().max(100).trim().optional(),
  primaryLanguage: z.enum(['ar', 'en']).default('ar'),
  denomination: z.string().max(100).trim().optional(),
  defaultBibleId: z.string().max(100).optional(),
  welcomeMessage: z.string().max(2000).trim().optional(),
  leaders: z.array(LeaderEntrySchema).max(20).optional(),
})

export type ChurchRegistrationInput = z.infer<typeof ChurchRegistrationSchema>

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
