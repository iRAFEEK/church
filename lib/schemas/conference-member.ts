import { z } from 'zod'

export const conferenceMemberSchema = z.object({
  profile_id: z.string().uuid(),
  role: z.enum(['conference_director', 'area_director', 'team_leader', 'sub_leader', 'volunteer']).default('volunteer'),
  shift_start: z.string().datetime().optional().nullable(),
  shift_end: z.string().datetime().optional().nullable(),
})

export const conferenceMemberBulkSchema = z.object({
  profile_ids: z.array(z.string().uuid()).min(1).max(200),
  role: z.enum(['conference_director', 'area_director', 'team_leader', 'sub_leader', 'volunteer']).default('volunteer'),
  shift_start: z.string().datetime().optional().nullable(),
  shift_end: z.string().datetime().optional().nullable(),
})

export const conferenceCheckinSchema = z.object({
  profile_id: z.string().uuid(),
  status: z.enum(['checked_in', 'checked_out', 'no_show']),
})
