import { z } from 'zod'
import { NEED_CATEGORIES, NEED_URGENCIES } from '@/lib/community/constants'

export const CreateChurchNeedSchema = z.object({
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  description_ar: z.string().max(5000).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  category: z.enum(NEED_CATEGORIES),
  quantity: z.number().int().min(1).default(1),
  urgency: z.enum(NEED_URGENCIES).default('medium'),
  contact_name: z.string().max(100).optional().nullable(),
  contact_phone: z.string().max(30).optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
})

export const UpdateChurchNeedSchema = CreateChurchNeedSchema.partial().extend({
  status: z.enum(['open', 'in_progress', 'fulfilled', 'closed']).optional(),
})

export const CreateNeedResponseSchema = z.object({
  message: z.string().min(1).max(2000),
  message_ar: z.string().max(2000).optional().nullable(),
})

export const UpdateNeedResponseStatusSchema = z.object({
  status: z.enum(['accepted', 'declined', 'completed']),
})

export const CreateNeedMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  message_ar: z.string().max(2000).optional().nullable(),
})
