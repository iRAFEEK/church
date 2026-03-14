import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { MinistryNotifySchema } from '@/lib/schemas/ministry'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

// POST /api/ministries/[id]/notify — send notification to all active ministry members
export const POST = apiHandler(async ({ req, supabase, profile, params }) => {
  const ministry_id = params!.id

  // Verify the ministry belongs to this church
  const { data: ministry } = await supabase
    .from('ministries')
    .select('id')
    .eq('id', ministry_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!ministry) {
    return { error: 'Not found' }
  }

  // Check if user is a leader of this ministry (or super_admin/ministry_leader role already verified by apiHandler)
  const isSuperAdmin = profile.role === 'super_admin'
  const isMinistryLeader = profile.role === 'ministry_leader'

  if (!isSuperAdmin && !isMinistryLeader) {
    // Check ministry-level leadership
    const { data: membership } = await supabase
      .from('ministry_members')
      .select('role_in_ministry')
      .eq('ministry_id', ministry_id)
      .eq('profile_id', profile.id)
      .eq('church_id', profile.church_id)
      .eq('is_active', true)
      .single()

    if (!membership || membership.role_in_ministry !== 'leader') {
      return { error: 'Forbidden' }
    }
  }

  const body = validate(MinistryNotifySchema, await req.json())

  // Fetch all active ministry members
  const { data: members } = await supabase
    .from('ministry_members')
    .select('profile_id')
    .eq('ministry_id', ministry_id)
    .eq('church_id', profile.church_id)
    .eq('is_active', true)

  if (!members || members.length === 0) {
    return { sent: 0, targets: 0 }
  }

  let sent = 0
  for (const member of members) {
    try {
      await sendNotification({
        profileId: member.profile_id,
        churchId: profile.church_id,
        type: 'general',
        titleEn: body.titleEn || body.titleAr || '',
        titleAr: body.titleAr || body.titleEn || '',
        bodyEn: body.bodyEn || body.bodyAr || '',
        bodyAr: body.bodyAr || body.bodyEn || '',
        referenceType: 'ministry',
        referenceId: ministry_id,
      })
      sent++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to notify ministry member', {
        module: 'ministries',
        churchId: profile.church_id,
        userId: member.profile_id,
        error: message,
      })
    }
  }

  return { sent, targets: members.length }
}, { requireRoles: ['ministry_leader', 'super_admin'] })
