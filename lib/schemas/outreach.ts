import { z } from 'zod'

export const CreateOutreachVisitSchema = z.object({
  profile_id: z.string().uuid(),
  visit_date: z.string().optional(),
  notes: z.string().max(5000).optional().nullable(),
  needs_followup: z.boolean().optional().default(false),
  followup_date: z.string().optional().nullable(),
  followup_notes: z.string().max(5000).optional().nullable(),
})

// Member-facing "log my assigned visit" payload (POST /api/outreach/assignments/[id]/log).
// profile_id is NOT accepted from the client — it is derived from the assignment row.
export const LogOutreachVisitSchema = z.object({
  visit_date: z.string().optional(),
  notes: z.string().max(5000).optional().nullable(),
  needs_followup: z.boolean().optional().default(false),
  followup_date: z.string().optional().nullable(),
  followup_notes: z.string().max(5000).optional().nullable(),
})

export const UpdateOutreachVisitSchema = z.object({
  visit_date: z.string().optional(),
  notes: z.string().max(5000).optional().nullable(),
  needs_followup: z.boolean().optional(),
  followup_date: z.string().optional().nullable(),
  followup_notes: z.string().max(5000).optional().nullable(),
})
