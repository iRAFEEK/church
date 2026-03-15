import { z } from 'zod'

export const CreateChurchPrayerSchema = z.object({
  content: z.string().min(1).max(2000),
  is_anonymous: z.boolean().optional().default(false),
  is_private: z.boolean().optional().default(false),
})

export const UpdatePrayerRequestSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  is_private: z.boolean().optional(),
  status: z.enum(['pending', 'praying', 'answered', 'archived']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  resolved_notes: z.string().max(5000).optional().nullable(),
})

export const AssignPrayerSchema = z.object({
  assigned_to: z.string().uuid(),
})
