import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

// PATCH /api/community/needs/[id]/responses/[responseId]/messages/read
// Marks messages as read for the current user's church
export const PATCH = apiHandler(async ({ profile, params }) => {
  const { responseId } = params!
  const admin = await createAdminClient()

  const { error } = await admin
    .from('church_need_message_reads' as any)
    .upsert(
      { response_id: responseId, church_id: profile.church_id, last_read_at: new Date().toISOString() },
      { onConflict: 'response_id,church_id' }
    )

  if (error) throw error

  return { success: true }
}, { requirePermissions: ['can_view_church_needs'] })
