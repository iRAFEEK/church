import { z } from 'zod'

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  description_ar: z.string().max(2000).optional().nullable(),
  event_type: z.string().min(1).max(50),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  is_public: z.boolean().default(false),
  registration_required: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).default('draft'),
  notes: z.string().max(2000).optional().nullable(),
  notes_ar: z.string().max(2000).optional().nullable(),
  custom_field_values: z.record(z.unknown()).optional().nullable(),
  visibility_targets: z.array(z.object({
    target_type: z.enum(['ministry', 'group']),
    target_id: z.string().uuid(),
  })).optional(),
})

export const UpdateEventSchema = CreateEventSchema.partial()
