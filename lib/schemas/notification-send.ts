import { z } from 'zod'

const AudienceTargetSchema = z.object({
  type: z.enum(['all_church', 'roles', 'groups', 'ministries', 'statuses', 'visitors', 'gender']),
  roles: z.array(z.enum(['member', 'group_leader', 'ministry_leader', 'super_admin'])).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
  ministryIds: z.array(z.string().uuid()).optional(),
  statuses: z.array(z.enum(['active', 'inactive', 'at_risk', 'visitor'])).optional(),
  visitorStatuses: z.array(z.enum(['new', 'assigned', 'contacted'])).optional(),
  gender: z.enum(['male', 'female']).optional(),
})

export const SendNotificationSchema = z.object({
  titleEn: z.string().max(200).optional(),
  titleAr: z.string().min(1, 'Arabic title is required').max(200),
  bodyEn: z.string().max(2000).optional(),
  bodyAr: z.string().min(1, 'Arabic body is required').max(2000),
  targets: z.array(AudienceTargetSchema).min(1, 'At least one target is required'),
  imageUrl: z.string().url().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
})

export const AudiencePreviewSchema = z.object({
  targets: z.array(AudienceTargetSchema).min(1, 'At least one target is required'),
})

export type SendNotificationInput = z.infer<typeof SendNotificationSchema>
export type AudiencePreviewInput = z.infer<typeof AudiencePreviewSchema>
