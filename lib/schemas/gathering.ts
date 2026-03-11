import { z } from 'zod'

export const CreateGatheringSchema = z.object({
  group_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  location: z.string().max(200).optional().nullable(),
  location_ar: z.string().max(200).optional().nullable(),
  topic: z.string().max(200).optional().nullable(),
  topic_ar: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const UpdateGatheringSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  location: z.string().max(200).optional().nullable(),
  location_ar: z.string().max(200).optional().nullable(),
  topic: z.string().max(200).optional().nullable(),
  topic_ar: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
})
