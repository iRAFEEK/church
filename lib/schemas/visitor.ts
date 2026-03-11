import { z } from 'zod'

export const CreateVisitorSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  first_name_ar: z.string().max(100).optional().nullable(),
  last_name_ar: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  age_range: z.enum(['under_18', '18_25', '26_35', '36_45', '46_55', '56_plus']).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  how_heard: z.enum(['friend', 'social_media', 'website', 'event', 'walk_in', 'other']).optional().nullable(),
  visited_at: z.string().optional(),
})

export const UpdateVisitorSchema = z.object({
  status: z.enum(['new', 'assigned', 'contacted', 'converted', 'lost']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  contacted_at: z.string().datetime().optional().nullable(),
  contact_notes: z.string().max(2000).optional().nullable(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
})
