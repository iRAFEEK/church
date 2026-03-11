import { z } from 'zod'

export const CreateServingAreaSchema = z.object({
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  description_ar: z.string().max(1000).optional().nullable(),
  ministry_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
})

export const UpdateServingAreaSchema = CreateServingAreaSchema.partial()

export const CreateServingSlotSchema = z.object({
  serving_area_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  date: z.string(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  max_volunteers: z.number().int().min(1).max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  notes_ar: z.string().max(1000).optional().nullable(),
})

export const UpdateServingSlotSchema = CreateServingSlotSchema.partial()
