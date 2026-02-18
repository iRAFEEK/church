export type MessageChannel = 'whatsapp' | 'email' | 'in_app'

export type NotificationType =
  | 'gathering_reminder'
  | 'visitor_assigned'
  | 'visitor_welcome'
  | 'at_risk_alert'
  | 'visitor_sla_warning'
  | 'event_reminder'
  | 'general'

export interface MessagePayload {
  to: string                          // phone number, email, or profile_id
  template: string                    // template key from templates.ts
  params: Record<string, string>      // template interpolation params
  channel: MessageChannel
  locale?: 'ar' | 'en'
}

export interface MessageResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface MessageProvider {
  send(payload: MessagePayload): Promise<MessageResult>
  isConfigured(): boolean
}

export interface NotificationRequest {
  profileId: string
  churchId: string
  type: NotificationType
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  referenceId?: string
  referenceType?: string
  data?: Record<string, string>
  // Override channels (if not set, uses user preference)
  channels?: MessageChannel[]
  // For WhatsApp — the phone number (if different from profile)
  phone?: string
  // For email — the email address (if different from profile)
  email?: string
}
