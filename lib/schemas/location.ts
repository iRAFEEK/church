import { z } from 'zod'

// ============================================================
// Location schemas
// ============================================================

export const CreateLocationSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  location_type: z.enum(['sanctuary', 'hall', 'classroom', 'prayer_room', 'office', 'nursery', 'other']),
  capacity: z.number().int().positive().optional().nullable(),
  features: z.array(z.string().max(100)).max(20).default([]),
  notes: z.string().max(2000).optional().nullable(),
  notes_ar: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().default(true),
})

export const UpdateLocationSchema = CreateLocationSchema.partial()

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>

// ============================================================
// Booking schemas
// ============================================================

const datetimeString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date/time format' }
)

export const CreateBookingSchema = z.object({
  location_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  starts_at: datetimeString,
  ends_at: datetimeString,
  notes: z.string().max(2000).optional().nullable(),
  is_public: z.boolean().default(false),
}).refine(
  (data) => new Date(data.ends_at) > new Date(data.starts_at),
  { message: 'End time must be after start time', path: ['ends_at'] }
)

export const UpdateBookingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  title_ar: z.string().max(200).optional().nullable(),
  starts_at: datetimeString.optional(),
  ends_at: datetimeString.optional(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['confirmed', 'cancelled']).optional(),
  is_public: z.boolean().optional(),
})

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>
export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>
