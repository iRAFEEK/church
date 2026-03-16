import { z } from 'zod'

export const CreateServiceRequestSchema = z.object({
  requested_role: z.string().min(1).max(200),
  assigned_to: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
})

export const UpdateServiceRequestSchema = z.object({
  status: z.enum(['accepted', 'declined', 'reassigned']),
  response_note: z.string().max(2000).optional().nullable(),
  reassign_to: z.string().uuid().optional(),
})

export type CreateServiceRequestInput = z.infer<typeof CreateServiceRequestSchema>
export type UpdateServiceRequestInput = z.infer<typeof UpdateServiceRequestSchema>
