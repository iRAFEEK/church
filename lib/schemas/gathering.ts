import { z } from 'zod'

export const CreateGatheringSchema = z.object({
  group_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  location: z.string().max(200).optional().nullable(),
  location_ar: z.string().max(200).optional().nullable(),
  topic: z.string().max(200).optional().nullable(),
  topic_ar: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const UpdateGatheringSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  location: z.string().max(200).optional().nullable(),
  location_ar: z.string().max(200).optional().nullable(),
  topic: z.string().max(200).optional().nullable(),
  topic_ar: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
})

// Attendance bulk upsert — POST /api/gatherings/[id]/attendance
const AttendanceRecordSchema = z.object({
  profile_id: z.string().uuid(),
  status: z.enum(['present', 'absent', 'excused', 'late']),
  excuse_reason: z.string().max(500).optional().nullable(),
})

export const BulkAttendanceSchema = z.object({
  records: z.array(AttendanceRecordSchema).min(1),
})

// Prayer request — POST /api/gatherings/[id]/prayer
export const CreateGatheringPrayerSchema = z.object({
  content: z.string().min(1).max(2000),
  is_private: z.boolean().optional().default(false),
})

// Group gathering — POST /api/groups/[id]/gatherings
export const CreateGroupGatheringSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  location: z.string().max(200).optional().nullable(),
  topic: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})
