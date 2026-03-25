import { z } from 'zod'

export const conferenceBroadcastSchema = z.object({
  message: z.string().min(1).max(1000),
  message_ar: z.string().max(1000).optional(),
  is_urgent: z.boolean().default(false),
  team_id: z.string().uuid().optional().nullable(),
  area_id: z.string().uuid().optional().nullable(),
})

export const conferenceBoardColumnSchema = z.object({
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const conferenceBoardCardSchema = z.object({
  column_id: z.string().uuid().optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  ministry_id: z.string().uuid().optional().nullable(),
  custom_name: z.string().max(100).optional().nullable(),
  custom_name_ar: z.string().max(100).optional().nullable(),
  assigned_leader_id: z.string().uuid().optional().nullable(),
  assigned_leader_external_phone: z.string().max(30).optional().nullable(),
  headcount_target: z.number().int().positive().optional().nullable(),
  status: z.enum(['planning', 'leader_notified', 'in_progress', 'ready', 'done']).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const conferenceInviteSchema = z.object({
  card_id: z.string().uuid().optional().nullable(),
  role: z.enum(['co_planner', 'ministry_lead']).default('co_planner'),
  external_email: z.string().email().optional(),
  external_phone: z.string().max(30).optional(),
  external_church_name: z.string().max(100).optional(),
  user_id: z.string().uuid().optional(),
})

export const conferencePublishSchema = z.object({
  show_ministries: z.boolean().optional(),
  show_schedule: z.boolean().optional(),
  allow_public: z.boolean().optional(),
  public_tagline: z.string().max(200).optional(),
  public_tagline_ar: z.string().max(200).optional(),
  campaign_id: z.string().uuid().optional().nullable(),
  checkin_open_minutes_before: z.number().int().min(0).max(480).optional(),
  notify_church: z.boolean().optional(),
})
