import { createClient } from '@/lib/supabase/server'
import { sendNotification } from './dispatcher'
import { TEMPLATES, interpolate } from './templates'

/**
 * Send welcome message to a new visitor.
 * Called from POST /api/visitors
 */
export async function notifyWelcomeVisitor(visitorId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const { data: visitor } = await supabase
      .from('visitors')
      .select('first_name, last_name, phone, email')
      .eq('id', visitorId)
      .single()

    const { data: church } = await supabase
      .from('churches')
      .select('name, name_ar')
      .eq('id', churchId)
      .single()

    if (!visitor?.phone || !church) return

    const template = TEMPLATES.visitor_welcome
    const params = {
      churchName: church.name_ar || church.name,
      visitorName: `${visitor.first_name} ${visitor.last_name}`,
    }

    // Send WhatsApp directly to visitor's phone (no profile needed)
    const { whatsappProvider } = await import('./providers/whatsapp')
    if (whatsappProvider.isConfigured()) {
      await whatsappProvider.send({
        to: visitor.phone,
        template: template.whatsappTemplate,
        params,
        channel: 'whatsapp',
        locale: 'ar',
      })
    }

    // Log it
    await supabase.from('notifications_log').insert({
      church_id: churchId,
      type: 'visitor_welcome',
      channel: 'whatsapp',
      title: template.titleAr,
      body: interpolate(template.bodyAr, params),
      payload: params,
      status: 'sent',
      reference_id: visitorId,
      reference_type: 'visitor',
      sent_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Trigger] notifyWelcomeVisitor error:', error)
  }
}

/**
 * Notify leader when a visitor is assigned to them.
 * Called from PATCH /api/visitors/[id] (assign action)
 */
export async function notifyVisitorAssigned(visitorId: string, leaderId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const { data: visitor } = await supabase
      .from('visitors')
      .select('first_name, last_name')
      .eq('id', visitorId)
      .single()

    if (!visitor) return

    const visitorName = `${visitor.first_name} ${visitor.last_name}`
    const template = TEMPLATES.visitor_assigned

    await sendNotification({
      profileId: leaderId,
      churchId,
      type: 'visitor_assigned',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { visitorName }),
      bodyAr: interpolate(template.bodyAr, { visitorName }),
      referenceId: visitorId,
      referenceType: 'visitor',
      data: { visitorName },
    })
  } catch (error) {
    console.error('[Trigger] notifyVisitorAssigned error:', error)
  }
}

/**
 * Notify group leader when a member is flagged as at-risk.
 * Called after attendance completion detects consecutive absences.
 */
export async function notifyAtRiskMember(
  memberId: string,
  groupId: string,
  churchId: string,
  consecutiveAbsences: number
) {
  try {
    const supabase = await createClient()

    const { data: member } = await supabase
      .from('profiles')
      .select('first_name, first_name_ar, last_name, last_name_ar')
      .eq('id', memberId)
      .single()

    const { data: group } = await supabase
      .from('groups')
      .select('name, name_ar, leader_id')
      .eq('id', groupId)
      .single()

    if (!member || !group?.leader_id) return

    const memberName = `${member.first_name_ar || member.first_name} ${member.last_name_ar || member.last_name}`
    const groupName = group.name_ar || group.name
    const weeks = String(consecutiveAbsences)
    const template = TEMPLATES.at_risk_alert

    await sendNotification({
      profileId: group.leader_id,
      churchId,
      type: 'at_risk_alert',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { memberName, groupName, weeks }),
      bodyAr: interpolate(template.bodyAr, { memberName, groupName, weeks }),
      referenceId: memberId,
      referenceType: 'profile',
      data: { memberName, groupName, weeks },
    })
  } catch (error) {
    console.error('[Trigger] notifyAtRiskMember error:', error)
  }
}

/**
 * Notify admins about visitor SLA breach.
 */
export async function notifyVisitorSLA(visitorId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const { data: visitor } = await supabase
      .from('visitors')
      .select('first_name, last_name')
      .eq('id', visitorId)
      .single()

    if (!visitor) return

    // Get all admins for this church
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('church_id', churchId)
      .eq('role', 'super_admin')

    if (!admins?.length) return

    const visitorName = `${visitor.first_name} ${visitor.last_name}`
    const template = TEMPLATES.visitor_sla_warning

    // Send to all admins
    for (const admin of admins) {
      await sendNotification({
        profileId: admin.id,
        churchId,
        type: 'visitor_sla_warning',
        titleEn: template.titleEn,
        titleAr: template.titleAr,
        bodyEn: interpolate(template.bodyEn, { visitorName }),
        bodyAr: interpolate(template.bodyAr, { visitorName }),
        referenceId: visitorId,
        referenceType: 'visitor',
        data: { visitorName },
      })
    }
  } catch (error) {
    console.error('[Trigger] notifyVisitorSLA error:', error)
  }
}

/**
 * Send gathering reminder to all group members.
 * Called by a cron/scheduled function.
 */
export async function notifyGatheringReminder(gatheringId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const { data: gathering } = await supabase
      .from('gatherings')
      .select('group_id, scheduled_at, location, topic')
      .eq('id', gatheringId)
      .single()

    if (!gathering) return

    const { data: group } = await supabase
      .from('groups')
      .select('name, name_ar')
      .eq('id', gathering.group_id)
      .single()

    const { data: members } = await supabase
      .from('group_members')
      .select('profile_id')
      .eq('group_id', gathering.group_id)
      .eq('is_active', true)

    if (!group || !members?.length) return

    const time = new Date(gathering.scheduled_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const template = TEMPLATES.gathering_reminder
    const groupName = group.name_ar || group.name
    const location = gathering.location || ''

    for (const member of members) {
      await sendNotification({
        profileId: member.profile_id,
        churchId,
        type: 'gathering_reminder',
        titleEn: template.titleEn,
        titleAr: template.titleAr,
        bodyEn: interpolate(template.bodyEn, { groupName, time, location }),
        bodyAr: interpolate(template.bodyAr, { groupName, time, location }),
        referenceId: gatheringId,
        referenceType: 'gathering',
        data: { groupName, time, location },
      })
    }
  } catch (error) {
    console.error('[Trigger] notifyGatheringReminder error:', error)
  }
}
