import { z } from 'zod'

export const SendNotificationSchema = z.object({
  scope: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  channels: z.array(z.enum(['whatsapp', 'email', 'in_app'])).min(1),
  target_ids: z.array(z.string().uuid()).optional(),
  reference_type: z.string().max(50).optional().nullable(),
  reference_id: z.string().uuid().optional().nullable(),
})
