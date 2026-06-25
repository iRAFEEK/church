-- Migration 080: per-church opt-in for the paid WhatsApp NOTIFICATION channel.
--
-- WhatsApp messages cost money per send; in-app push (FCM) + in-app are free.
-- Notifications (reminders, announcements, etc.) default to the free channels and
-- only use the paid WhatsApp channel when a church has explicitly enabled it.
--
-- Default false => free push + in-app only (cost control).
--
-- NOTE: This gates ONLY the notification/messaging WhatsApp channel
-- (lib/messaging/* dispatcher). The WhatsApp OTP / phone-verification auth flow
-- (lib/whatsapp/otp.ts, the SMS/verify hook) is a separate system and is NOT
-- affected by this flag.

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN churches.whatsapp_notifications_enabled IS
  'Opt-in gate for the paid WhatsApp NOTIFICATION channel (messaging dispatcher). Default false = free push + in-app only. Does NOT affect WhatsApp OTP/verification auth.';
