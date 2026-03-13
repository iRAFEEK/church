import { z } from 'zod'

const positiveFiniteAmount = z
  .number()
  .positive('Amount must be positive')
  .finite('Amount must be finite')
  .max(10_000_000, 'Amount cannot exceed 10,000,000')

export const CreateDonationSchema = z.object({
  amount: positiveFiniteAmount,
  currency: z.string().min(1).max(10).default('EGP'),
  donation_date: z.string().min(1, 'Donation date is required'),
  payment_method: z.enum(['cash', 'check', 'bank_transfer', 'online', 'mobile', 'other']).default('cash'),
  donor_id: z.string().uuid().optional().nullable(),
  fund_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  batch_id: z.string().uuid().optional().nullable(),
  receipt_number: z.string().max(100).optional().nullable(),
  check_number: z.string().max(100).optional().nullable(),
  exchange_rate: z.number().positive().finite().max(1_000_000).default(1.0),
  is_anonymous: z.boolean().default(false),
  is_tithe: z.boolean().default(false),
  is_tax_deductible: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
})

export const UpdateDonationSchema = CreateDonationSchema.partial()
