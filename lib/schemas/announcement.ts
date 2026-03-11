import { z } from 'zod'

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  body: z.string().max(5000).optional().nullable(),
  body_ar: z.string().max(5000).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  is_pinned: z.boolean().default(false),
  expires_at: z.string().datetime().optional().nullable(),
})

export const UpdateAnnouncementSchema = CreateAnnouncementSchema.partial()
