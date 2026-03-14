import { z } from 'zod'

export const CreateMinistrySchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  description_ar: z.string().max(2000).optional().nullable(),
  leader_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  photo_url: z.string().url().optional().nullable(),
})

export const UpdateMinistrySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ar: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  description_ar: z.string().max(2000).optional().nullable(),
  leader_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
  photo_url: z.string().url().optional().nullable(),
})

export const AddMinistryMemberSchema = z.object({
  profile_id: z.string().uuid(),
  role_in_ministry: z.enum(['member', 'leader']).default('member'),
})

export const UpdateMinistryMemberSchema = z.object({
  profile_id: z.string().uuid(),
  role_in_ministry: z.enum(['member', 'leader']),
})

export const RemoveMinistryMemberSchema = z.object({
  profile_id: z.string().uuid(),
})

export const MinistryNotifySchema = z.object({
  titleAr: z.string().max(500).optional().nullable(),
  titleEn: z.string().max(500).optional().nullable(),
  bodyAr: z.string().max(5000).optional().nullable(),
  bodyEn: z.string().max(5000).optional().nullable(),
}).refine(
  (data) => data.titleAr || data.titleEn,
  { message: 'At least one title (Arabic or English) is required', path: ['titleAr'] }
)
