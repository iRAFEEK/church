import { z } from 'zod'

export const UpdateMinistrySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  description_ar: z.string().max(2000).optional().nullable(),
  leader_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  photo_url: z.string().url().optional().nullable(),
})
