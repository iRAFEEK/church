import { z } from 'zod'

export const conferenceTaskSchema = z.object({
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  description_ar: z.string().max(1000).optional(),
  team_id: z.string().uuid().optional().nullable(),
  area_id: z.string().uuid().optional().nullable(),
  card_id: z.string().uuid().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'blocked', 'done']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
})
