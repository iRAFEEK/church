import { z } from 'zod'

// Public visitor form (QR code / join page) — no auth required
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
  church_id: z.string().uuid().optional().nullable(),
})

// Generic field updates (admin editing visitor details)
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

// Action-specific schemas for PATCH operations
export const AssignVisitorSchema = z.object({
  action: z.literal('assign'),
  assigned_to: z.string().uuid(),
})

export const ContactVisitorSchema = z.object({
  action: z.literal('contact'),
  contact_notes: z.string().max(2000).optional().nullable(),
})

export const ConvertVisitorSchema = z.object({
  action: z.literal('convert'),
})

// Discriminated union of all PATCH payloads
export const PatchVisitorSchema = z.discriminatedUnion('action', [
  AssignVisitorSchema,
  ContactVisitorSchema,
  ConvertVisitorSchema,
]).or(UpdateVisitorSchema)
