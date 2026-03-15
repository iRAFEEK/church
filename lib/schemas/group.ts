import { z } from 'zod'

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional().nullable(),
  type: z.enum(['small_group', 'youth', 'women', 'men', 'family', 'prayer', 'other']),
  ministry_id: z.string().uuid().optional().nullable(),
  leader_id: z.string().uuid().optional().nullable(),
  co_leader_id: z.string().uuid().optional().nullable(),
  meeting_day: z.string().min(1).max(20),
  meeting_time: z.string().min(1).max(10),
  meeting_location: z.string().max(200).optional().nullable(),
  meeting_location_ar: z.string().max(200).optional().nullable(),
  meeting_frequency: z.enum(['weekly', 'biweekly', 'monthly', 'irregular']),
  max_members: z.number().int().min(1).max(1000).optional().nullable(),
  is_open: z.boolean().default(true),
  is_active: z.boolean().default(true),
})

export const UpdateGroupSchema = CreateGroupSchema.partial()
