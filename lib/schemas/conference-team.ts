import { z } from 'zod'

export const conferenceTeamSchema = z.object({
  area_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  description_ar: z.string().max(500).optional(),
  muster_point: z.string().max(200).optional(),
  muster_point_ar: z.string().max(200).optional(),
  target_headcount: z.number().int().positive().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
})
