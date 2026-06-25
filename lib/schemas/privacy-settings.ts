import { z } from 'zod'
import { MEMBER_DIRECTORY_VISIBILITY_VALUES } from '@/lib/members/visibility'

// Per-church member-directory privacy settings (Track A5, migration 081).
// member_directory_visibility controls who sees member phone numbers in the directory.
export const PrivacySettingsSchema = z.object({
  member_directory_visibility: z.enum(
    MEMBER_DIRECTORY_VISIBILITY_VALUES as unknown as [string, ...string[]],
  ),
})

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>
