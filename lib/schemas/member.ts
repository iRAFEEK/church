import { z } from 'zod'

// E.164: leading "+", 8–15 digits. Matches PhoneLoginForm's PHONE_RE so a leader
// adds the exact string the member will later sign in with.
const E164_RE = /^\+\d{8,15}$/

// Track A3 — a leader/admin adds a member by name (+ optional phone).
// Phone is OPTIONAL: phone-less members (kids/elderly) are pure managed records that
// never claim. When present it must be E.164 (it becomes a login credential).
export const AddMemberSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100).trim(),
  last_name: z.string().min(1, 'Last name is required').max(100).trim(),
  first_name_ar: z.string().max(100).trim().optional().nullable(),
  last_name_ar: z.string().max(100).trim().optional().nullable(),
  phone: z
    .string()
    .trim()
    .regex(E164_RE, 'Phone must be in international format, e.g. +201234567890')
    .optional()
    .nullable(),
  // Only super_admin may seed a non-member role (enforced in the route, not just here).
  role: z.enum(['member', 'group_leader', 'ministry_leader']).optional().default('member'),
})

export type AddMemberInput = z.infer<typeof AddMemberSchema>
