import { z } from 'zod'

export const CreateOutreachAssignmentSchema = z.object({
  member_id: z.string().uuid(),
  assigned_to: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
})

export const UpdateOutreachAssignmentStatusSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'cancelled']),
})

export type CreateOutreachAssignmentInput = z.infer<typeof CreateOutreachAssignmentSchema>
export type UpdateOutreachAssignmentStatusInput = z.infer<typeof UpdateOutreachAssignmentStatusSchema>
