import { z } from 'zod'

// Per-church notification channel settings.
// whatsapp_notifications_enabled gates the paid WhatsApp notification channel.
export const NotificationSettingsSchema = z.object({
  whatsapp_notifications_enabled: z.boolean(),
})

export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>
