import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendNotification } from './dispatcher'
import { TEMPLATES, interpolate } from './templates'
import { logger } from '@/lib/logger'

function truncate(text: string, max = 100): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

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
    logger.error('notifyWelcomeVisitor failed', { module: 'messaging', churchId, error })
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
    logger.error('notifyVisitorAssigned failed', { module: 'messaging', churchId, error })
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
    logger.error('notifyAtRiskMember failed', { module: 'messaging', churchId, error })
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
    logger.error('notifyVisitorSLA failed', { module: 'messaging', churchId, error })
  }
}

/**
 * Notify ministry/group leader when their team is tagged for an event.
 * Called from PUT /api/events/[id]/service-needs
 */
export async function notifyEventServiceRequest(eventId: string, serviceNeedId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const { data: need } = await supabase
      .from('event_service_needs')
      .select('ministry_id, group_id, volunteers_needed')
      .eq('id', serviceNeedId)
      .single()

    if (!need) return

    const { data: event } = await supabase
      .from('events')
      .select('title, title_ar, starts_at')
      .eq('id', eventId)
      .single()

    if (!event) return

    let leaderId: string | null = null
    let teamName = ''

    if (need.ministry_id) {
      const { data: ministry } = await supabase
        .from('ministries')
        .select('name, name_ar, leader_id')
        .eq('id', need.ministry_id)
        .single()
      if (!ministry?.leader_id) return
      leaderId = ministry.leader_id
      teamName = ministry.name_ar || ministry.name
    } else if (need.group_id) {
      const { data: group } = await supabase
        .from('groups')
        .select('name, name_ar, leader_id')
        .eq('id', need.group_id)
        .single()
      if (!group?.leader_id) return
      leaderId = group.leader_id
      teamName = group.name_ar || group.name
    }

    if (!leaderId) return

    const eventName = event.title_ar || event.title
    const date = new Date(event.starts_at).toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const count = String(need.volunteers_needed)
    const template = TEMPLATES.event_service_request

    await sendNotification({
      profileId: leaderId,
      churchId,
      type: 'event_service_request',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { teamName, eventName, date, count }),
      bodyAr: interpolate(template.bodyAr, { teamName, eventName, date, count }),
      referenceId: eventId,
      referenceType: 'event',
      data: { teamName, eventName, date, count },
    })
  } catch (error) {
    logger.error('notifyEventServiceRequest failed', { module: 'messaging', churchId, error })
  }
}

/**
 * Notify a member when they are assigned to serve at an event.
 * Called from POST /api/events/[id]/service-needs/[needId]/assignments
 */
export async function notifyEventServiceAssigned(assignmentId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const { data: assignment } = await supabase
      .from('event_service_assignments')
      .select('profile_id, service_need_id, role, role_ar')
      .eq('id', assignmentId)
      .single()

    if (!assignment) return

    const { data: need } = await supabase
      .from('event_service_needs')
      .select('event_id, ministry_id, group_id')
      .eq('id', assignment.service_need_id)
      .single()

    if (!need) return

    const { data: event } = await supabase
      .from('events')
      .select('title, title_ar, starts_at')
      .eq('id', need.event_id)
      .single()

    if (!event) return

    let teamName = ''
    if (need.ministry_id) {
      const { data: ministry } = await supabase
        .from('ministries')
        .select('name, name_ar')
        .eq('id', need.ministry_id)
        .single()
      teamName = ministry?.name_ar || ministry?.name || ''
    } else if (need.group_id) {
      const { data: group } = await supabase
        .from('groups')
        .select('name, name_ar')
        .eq('id', need.group_id)
        .single()
      teamName = group?.name_ar || group?.name || ''
    }

    const eventName = event.title_ar || event.title
    const date = new Date(event.starts_at).toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const roleInfo = assignment.role ? ` as ${assignment.role}` : ''
    const roleInfoAr = assignment.role_ar || assignment.role ? ` بصفة ${assignment.role_ar || assignment.role}` : ''
    const template = TEMPLATES.event_service_assigned

    await sendNotification({
      profileId: assignment.profile_id,
      churchId,
      type: 'event_service_assigned',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { eventName, date, teamName, roleInfo }),
      bodyAr: interpolate(template.bodyAr, { eventName, date, teamName, roleInfo: roleInfoAr }),
      referenceId: need.event_id,
      referenceType: 'event',
      data: { eventName, date, teamName, roleInfo },
    })
  } catch (error) {
    logger.error('notifyEventServiceAssigned failed', { module: 'messaging', churchId, error })
  }
}

/**
 * Notify assigner when a member confirms or declines their service assignment.
 * Called from PATCH /api/events/[id]/service-needs/[needId]/assignments/[assignmentId]
 */
export async function notifyAssignmentResponse(assignmentId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const { data: assignment } = await supabase
      .from('event_service_assignments')
      .select('profile_id, service_need_id, assigned_by, status, role, role_ar')
      .eq('id', assignmentId)
      .single()

    if (!assignment?.assigned_by) return

    // Get member name
    const { data: member } = await supabase
      .from('profiles')
      .select('first_name, last_name, first_name_ar, last_name_ar')
      .eq('id', assignment.profile_id)
      .single()

    if (!member) return

    const { data: need } = await supabase
      .from('event_service_needs')
      .select('event_id, ministry_id, group_id')
      .eq('id', assignment.service_need_id)
      .single()

    if (!need) return

    const { data: event } = await supabase
      .from('events')
      .select('title, title_ar')
      .eq('id', need.event_id)
      .single()

    if (!event) return

    let teamName = ''
    if (need.ministry_id) {
      const { data: ministry } = await supabase
        .from('ministries')
        .select('name, name_ar')
        .eq('id', need.ministry_id)
        .single()
      teamName = ministry?.name_ar || ministry?.name || ''
    } else if (need.group_id) {
      const { data: group } = await supabase
        .from('groups')
        .select('name, name_ar')
        .eq('id', need.group_id)
        .single()
      teamName = group?.name_ar || group?.name || ''
    }

    const memberName = `${member.first_name_ar || member.first_name || ''} ${member.last_name_ar || member.last_name || ''}`.trim()
    const eventName = event.title_ar || event.title
    const action = assignment.status === 'confirmed' ? 'confirmed' : 'declined'
    const actionAr = assignment.status === 'confirmed' ? 'أكّد' : 'رفض'
    const roleInfo = assignment.role ? ` as ${assignment.role}` : ''
    const roleInfoAr = assignment.role_ar || assignment.role ? ` بصفة ${assignment.role_ar || assignment.role}` : ''
    const template = TEMPLATES.event_service_response

    await sendNotification({
      profileId: assignment.assigned_by,
      churchId,
      type: 'event_service_response',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { memberName, action, eventName, teamName, roleInfo }),
      bodyAr: interpolate(template.bodyAr, { memberName, actionAr, eventName, teamName, roleInfo: roleInfoAr }),
      referenceId: need.event_id,
      referenceType: 'event',
      data: { memberName, action, eventName, teamName },
    })
  } catch (error) {
    logger.error('notifyAssignmentResponse failed', { module: 'messaging', churchId, error })
  }
}

/**
 * Notify the need-owner church's admin when another church offers help.
 * Called from POST /api/community/needs/[id]/responses
 */
export async function notifyNeedResponseReceived(
  needId: string,
  responderChurchId: string,
  message: string
) {
  try {
    const supabase = await createAdminClient()

    // Get need + owner church info
    const { data: need } = await supabase
      .from('church_needs')
      .select('title, title_ar, church_id, created_by')
      .eq('id', needId)
      .single()

    if (!need) return

    // Get responder church name
    const { data: responderChurch } = await supabase
      .from('churches')
      .select('name, name_ar')
      .eq('id', responderChurchId)
      .single()

    if (!responderChurch) return

    const needTitle = need.title_ar || need.title
    const churchName = responderChurch.name_ar || responderChurch.name
    const template = TEMPLATES.need_response_received
    const truncatedMessage = truncate(message)

    await sendNotification({
      profileId: need.created_by,
      churchId: need.church_id,
      type: 'need_response_received',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { churchName, needTitle, message: truncatedMessage }),
      bodyAr: interpolate(template.bodyAr, { churchName, needTitle, message: truncatedMessage }),
      referenceId: needId,
      referenceType: 'church_need',
      data: { churchName, needTitle, message: truncatedMessage },
    })
  } catch (error) {
    logger.error('notifyNeedResponseReceived failed', { module: 'messaging', error })
  }
}

/**
 * Notify the responder church's user when need owner accepts/declines/completes their offer.
 * Called from PATCH /api/community/needs/[id]/responses/[responseId]
 */
export async function notifyNeedResponseStatusChanged(
  needId: string,
  responseId: string,
  newStatus: 'accepted' | 'declined' | 'completed'
) {
  try {
    const supabase = await createAdminClient()

    // Get response + responder info
    const { data: response } = await supabase
      .from('church_need_responses')
      .select('responder_user_id, responder_church_id')
      .eq('id', responseId)
      .single()

    if (!response) return

    // Get need + owner church info
    const { data: need } = await supabase
      .from('church_needs')
      .select('title, title_ar, church_id')
      .eq('id', needId)
      .single()

    if (!need) return

    const { data: ownerChurch } = await supabase
      .from('churches')
      .select('name, name_ar')
      .eq('id', need.church_id)
      .single()

    if (!ownerChurch) return

    const needTitle = need.title_ar || need.title
    const churchName = ownerChurch.name_ar || ownerChurch.name
    const statusMap: Record<string, string> = { accepted: 'accepted', declined: 'declined', completed: 'completed' }
    const statusArMap: Record<string, string> = { accepted: 'قبول', declined: 'رفض', completed: 'إتمام' }
    const template = TEMPLATES.need_response_status_changed

    await sendNotification({
      profileId: response.responder_user_id,
      churchId: response.responder_church_id,
      type: 'need_response_status_changed',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { needTitle, status: statusMap[newStatus], churchName }),
      bodyAr: interpolate(template.bodyAr, { needTitle, statusAr: statusArMap[newStatus], churchName }),
      referenceId: needId,
      referenceType: 'church_need',
      data: { needTitle, status: statusMap[newStatus], statusAr: statusArMap[newStatus], churchName },
    })
  } catch (error) {
    logger.error('notifyNeedResponseStatusChanged failed', { module: 'messaging', error })
  }
}

/**
 * Notify the other party when a message is sent on a need response thread.
 * Called from POST /api/community/needs/[id]/responses/[responseId]/messages
 */
export async function notifyNeedMessage(
  needId: string,
  responseId: string,
  senderChurchId: string,
  recipientChurchId: string,
  message: string
) {
  try {
    const supabase = await createAdminClient()

    const [{ data: need }, { data: senderChurch }] = await Promise.all([
      supabase.from('church_needs').select('title, title_ar, church_id, created_by').eq('id', needId).single(),
      supabase.from('churches').select('name, name_ar').eq('id', senderChurchId).single(),
    ])

    if (!need || !senderChurch) return

    // Find the recipient user (the admin who created the need or the responder)
    let recipientUserId: string | null = null
    if (recipientChurchId === need.church_id) {
      recipientUserId = need.created_by
    } else {
      const { data: response } = await supabase
        .from('church_need_responses')
        .select('responder_user_id')
        .eq('id', responseId)
        .single()
      recipientUserId = response?.responder_user_id || null
    }

    if (!recipientUserId) return

    const needTitle = need.title_ar || need.title
    const churchName = senderChurch.name_ar || senderChurch.name
    const truncatedMessage = truncate(message)
    const template = TEMPLATES.need_message

    await sendNotification({
      profileId: recipientUserId,
      churchId: recipientChurchId,
      type: 'need_message',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { churchName, needTitle, message: truncatedMessage }),
      bodyAr: interpolate(template.bodyAr, { churchName, needTitle, message: truncatedMessage }),
      referenceId: needId,
      referenceType: 'church_need',
      data: { churchName, needTitle, message: truncatedMessage, responseId },
    })
  } catch (error) {
    logger.error('notifyNeedMessage failed', { module: 'messaging', error })
  }
}

/**
 * Notify group leader when someone requests to join their group.
 * Called from POST /api/groups/[id]/join-requests
 */
export async function notifyGroupJoinRequest(requestId: string, groupId: string, churchId: string) {
  try {
    const supabase = await createClient()

    const [{ data: request }, { data: group }] = await Promise.all([
      supabase
        .from('group_join_requests')
        .select('profile_id, profile:profile_id(first_name, last_name, first_name_ar, last_name_ar)')
        .eq('id', requestId)
        .single(),
      supabase
        .from('groups')
        .select('name, name_ar, leader_id')
        .eq('id', groupId)
        .single(),
    ])

    if (!request?.profile || !group?.leader_id) return

    const p = request.profile as unknown as { first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null }
    const memberName = `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
    const groupName = group.name_ar || group.name
    const template = TEMPLATES.group_join_request

    await sendNotification({
      profileId: group.leader_id,
      churchId,
      type: 'group_join_request',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { memberName, groupName }),
      bodyAr: interpolate(template.bodyAr, { memberName, groupName }),
      referenceId: groupId,
      referenceType: 'group',
      data: { memberName, groupName },
    })
  } catch (error) {
    logger.error('notifyGroupJoinRequest failed', { module: 'messaging', churchId, error })
  }
}

/**
 * Notify a member when they are added to a ministry.
 * Called from POST /api/ministries/[id]/members
 */
export async function notifyMinistryMemberAdded(
  profileId: string,
  ministryId: string,
  churchId: string
) {
  try {
    const supabase = await createClient()

    const { data: ministry } = await supabase
      .from('ministries')
      .select('name, name_ar')
      .eq('id', ministryId)
      .single()

    if (!ministry) return

    const ministryName = ministry.name_ar || ministry.name
    const template = TEMPLATES.ministry_member_added

    await sendNotification({
      profileId,
      churchId,
      type: 'ministry_member_added',
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: interpolate(template.bodyEn, { ministryName }),
      bodyAr: interpolate(template.bodyAr, { ministryName }),
      referenceId: ministryId,
      referenceType: 'ministry',
      data: { ministryName },
    })
  } catch (error) {
    logger.error('notifyMinistryMemberAdded failed', { module: 'messaging', churchId, error })
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
    logger.error('notifyGatheringReminder failed', { module: 'messaging', churchId, error })
  }
}

/**
 * Notify members when they are assigned action items from a ministry meeting.
 * Called from POST /api/ministries/[id]/meetings after creating action items.
 */
export async function notifyMeetingActionAssigned(
  churchId: string,
  meetingTitle: string,
  ministryName: string,
  actionItems: Array<{ title: string; assigned_to?: string | null; due_date?: string | null }>
) {
  try {
    const template = TEMPLATES.meeting_action_assigned
    const assignedItems = actionItems.filter(item => item.assigned_to)

    for (const item of assignedItems) {
      const dueDateInfo = item.due_date
        ? ` Due: ${new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : ''
      const dueDateInfoAr = item.due_date
        ? ` الموعد: ${new Date(item.due_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}`
        : ''

      const paramsEn = { taskTitle: item.title, meetingTitle, ministryName, dueDateInfo }
      const paramsAr = { taskTitle: item.title, meetingTitle, ministryName, dueDateInfo: dueDateInfoAr }

      await sendNotification({
        profileId: item.assigned_to!,
        churchId,
        type: 'meeting_action_assigned',
        titleEn: template.titleEn,
        titleAr: template.titleAr,
        bodyEn: interpolate(template.bodyEn, paramsEn),
        bodyAr: interpolate(template.bodyAr, paramsAr),
        referenceType: 'ministry_meeting',
        data: { taskTitle: item.title, meetingTitle, ministryName },
      })
    }
  } catch (error) {
    logger.error('notifyMeetingActionAssigned failed', { module: 'messaging', churchId, error })
  }
}
