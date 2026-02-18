/**
 * Notification templates with bilingual support.
 *
 * Each template has:
 * - whatsappTemplate: the Meta-approved template name (used by WhatsApp API)
 * - titleEn/titleAr: in-app notification title
 * - bodyEn/bodyAr: message body with {param} placeholders
 * - emailSubjectEn/emailSubjectAr: email subject line
 */

export interface NotificationTemplate {
  whatsappTemplate: string
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  emailSubjectEn: string
  emailSubjectAr: string
}

export const TEMPLATES: Record<string, NotificationTemplate> = {
  gathering_reminder: {
    whatsappTemplate: 'gathering_reminder',
    titleEn: 'Gathering Tomorrow',
    titleAr: 'اجتماع غداً',
    bodyEn: 'Reminder: {groupName} meets tomorrow at {time}. Location: {location}',
    bodyAr: 'تذكير: مجموعة {groupName} تجتمع غداً الساعة {time}. المكان: {location}',
    emailSubjectEn: 'Reminder: {groupName} gathering tomorrow',
    emailSubjectAr: 'تذكير: اجتماع {groupName} غداً',
  },

  visitor_assigned: {
    whatsappTemplate: 'visitor_assigned',
    titleEn: 'New Visitor Assigned',
    titleAr: 'زائر جديد مُسنَد إليك',
    bodyEn: 'New visitor {visitorName} has been assigned to you. Please reach out within 48 hours.',
    bodyAr: 'تم إسناد الزائر {visitorName} إليك. يرجى التواصل خلال 48 ساعة.',
    emailSubjectEn: 'New visitor assigned: {visitorName}',
    emailSubjectAr: 'زائر جديد مُسنَد إليك: {visitorName}',
  },

  visitor_welcome: {
    whatsappTemplate: 'visitor_welcome',
    titleEn: 'Welcome!',
    titleAr: 'أهلاً وسهلاً!',
    bodyEn: 'Welcome to {churchName}! We are glad you visited us. One of our team members will contact you soon.',
    bodyAr: 'أهلاً بك في {churchName}! يسعدنا زيارتك. سيتواصل معك أحد أعضاء فريقنا قريباً.',
    emailSubjectEn: 'Welcome to {churchName}!',
    emailSubjectAr: 'أهلاً بك في {churchName}!',
  },

  at_risk_alert: {
    whatsappTemplate: 'at_risk_alert',
    titleEn: 'Member Needs Follow-up',
    titleAr: 'عضو يحتاج متابعة',
    bodyEn: '{memberName} has been absent from {groupName} for {weeks} consecutive weeks. Consider reaching out.',
    bodyAr: '{memberName} غاب عن مجموعة {groupName} لمدة {weeks} أسابيع متتالية. يرجى التواصل.',
    emailSubjectEn: '{memberName} needs follow-up',
    emailSubjectAr: '{memberName} يحتاج متابعة',
  },

  visitor_sla_warning: {
    whatsappTemplate: 'visitor_sla_warning',
    titleEn: 'Visitor SLA Breach',
    titleAr: 'تأخر التواصل مع زائر',
    bodyEn: 'Visitor {visitorName} has not been contacted and the SLA window has passed. Please take action.',
    bodyAr: 'الزائر {visitorName} لم يتم التواصل معه وقد انتهت المهلة المحددة. يرجى اتخاذ إجراء.',
    emailSubjectEn: 'Overdue: Visitor {visitorName} not contacted',
    emailSubjectAr: 'تأخر: لم يتم التواصل مع الزائر {visitorName}',
  },

  event_reminder: {
    whatsappTemplate: 'event_reminder',
    titleEn: 'Event Tomorrow',
    titleAr: 'فعالية غداً',
    bodyEn: 'Reminder: {eventName} is happening tomorrow at {time}. Location: {location}',
    bodyAr: 'تذكير: {eventName} غداً الساعة {time}. المكان: {location}',
    emailSubjectEn: 'Reminder: {eventName} tomorrow',
    emailSubjectAr: 'تذكير: {eventName} غداً',
  },
}

/**
 * Interpolate template params into a string.
 * Replaces {key} with the value from params.
 */
export function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
}
