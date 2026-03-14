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

// Segments — PUT /api/events/[id]/segments
export const ReplaceSegmentsSchema = z.object({
  segments: z.array(z.object({
    title: z.string().min(1).max(200),
    title_ar: z.string().max(200).optional().nullable(),
    duration_minutes: z.number().int().positive().optional().nullable(),
    ministry_id: z.string().uuid().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    notes_ar: z.string().max(2000).optional().nullable(),
  })),
})

// Registrations — PATCH /api/events/[id]/registrations
export const UpdateRegistrationSchema = z.object({
  registrationId: z.string().uuid(),
  action: z.enum(['check_in', 'cancel']),
})

// Service needs — PUT /api/events/[id]/service-needs
export const ReplaceServiceNeedsSchema = z.object({
  needs: z.array(z.object({
    ministry_id: z.string().uuid().optional().nullable(),
    group_id: z.string().uuid().optional().nullable(),
    volunteers_needed: z.number().int().positive().default(1),
    notes: z.string().max(2000).optional().nullable(),
    notes_ar: z.string().max(2000).optional().nullable(),
  })),
})

// Service assignments — POST /api/events/[id]/service-needs/[needId]/assignments
export const CreateAssignmentSchema = z.object({
  profile_id: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
  role: z.string().max(200).optional().nullable(),
  role_ar: z.string().max(200).optional().nullable(),
})

// Service assignments — DELETE /api/events/[id]/service-needs/[needId]/assignments
export const DeleteAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
})

// Service assignment status — PATCH /api/events/[id]/service-needs/[needId]/assignments/[assignmentId]
export const UpdateAssignmentSchema = z.object({
  status: z.enum(['confirmed', 'declined']).optional(),
  role: z.string().max(200).optional().nullable(),
  role_ar: z.string().max(200).optional().nullable(),
}).refine(data => data.status !== undefined || data.role !== undefined || data.role_ar !== undefined, {
  message: 'At least one field must be provided',
})

// Event registration — POST /api/events/[id]/register (optional body)
export const EventRegistrationSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
})

// From template — POST /api/events/from-template
export const CreateFromTemplateSchema = z.object({
  template_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  overrides: z.record(z.unknown()).optional(),
  custom_field_values: z.record(z.unknown()).optional(),
})
