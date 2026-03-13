import { z } from 'zod'

export const UpdatePrayerRequestSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  is_private: z.boolean().optional(),
  status: z.enum(['pending', 'praying', 'answered', 'archived']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})
