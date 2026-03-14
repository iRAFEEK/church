import { z } from 'zod'

// --- Template needs (used in both create and PUT replace) ---

const templateNeedSchema = z.object({
  ministry_id: z.string().uuid().optional().nullable(),
  group_id: z.string().uuid().optional().nullable(),
  volunteers_needed: z.number().int().positive().default(1),
  notes: z.string().max(2000).optional().nullable(),
  notes_ar: z.string().max(2000).optional().nullable(),
  role_presets: z.array(z.unknown()).default([]),
})

// --- Template segments (used in both create and PUT replace) ---

const templateSegmentSchema = z.object({
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  ministry_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  notes_ar: z.string().max(2000).optional().nullable(),
})

// --- Create template ---

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  event_type: z.string().min(1).max(50).default('service'),
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  description_ar: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  is_public: z.boolean().default(true),
  registration_required: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
  notes_ar: z.string().max(2000).optional().nullable(),
  recurrence_type: z.enum(['none', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurrence_day: z.number().int().min(0).max(6).optional().nullable(),
  default_start_time: z.string().optional().nullable(),
  default_end_time: z.string().optional().nullable(),
  custom_fields: z.array(z.unknown()).default([]),
  needs: z.array(templateNeedSchema).optional(),
  segments: z.array(templateSegmentSchema).optional(),
})

// --- Update template (partial, excludes needs/segments) ---

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ar: z.string().max(200).optional().nullable(),
  event_type: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(200).optional(),
  title_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  description_ar: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  is_public: z.boolean().optional(),
  registration_required: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
  notes_ar: z.string().max(2000).optional().nullable(),
  is_active: z.boolean().optional(),
  recurrence_type: z.enum(['none', 'weekly', 'biweekly', 'monthly']).optional(),
  recurrence_day: z.number().int().min(0).max(6).optional().nullable(),
  default_start_time: z.string().optional().nullable(),
  default_end_time: z.string().optional().nullable(),
  custom_fields: z.array(z.unknown()).optional(),
})

// --- Replace needs (PUT body) ---

export const ReplaceTemplateNeedsSchema = z.object({
  needs: z.array(templateNeedSchema),
})

// --- Replace segments (PUT body) ---

export const ReplaceTemplateSegmentsSchema = z.object({
  segments: z.array(templateSegmentSchema),
})
