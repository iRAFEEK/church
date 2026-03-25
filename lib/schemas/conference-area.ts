import { z } from 'zod'

export const conferenceAreaSchema = z.object({
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  description_ar: z.string().max(500).optional(),
  location_hint: z.string().max(200).optional(),
  location_hint_ar: z.string().max(200).optional(),
  parent_area_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
})

export const conferenceAreaReorderSchema = z.array(
  z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0) })
).min(1).max(200)
