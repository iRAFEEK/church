import { z } from 'zod'

// Onboarding FIX 3 — cross-church invitation accept/decline.
// The caller acts on their OWN 'invited' user_churches rows only (self-scoped in the
// route by user_id = caller). `church_id` identifies which invitation to act on.
export const RespondInvitationSchema = z.object({
  church_id: z.string().uuid(),
})

export type RespondInvitationInput = z.infer<typeof RespondInvitationSchema>
