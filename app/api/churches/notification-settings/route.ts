import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { NotificationSettingsSchema } from '@/lib/schemas/notification-settings'
import { logger } from '@/lib/logger'

// GET /api/churches/notification-settings
// Authenticated — super_admin only. Returns the church's notification channel settings.
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('churches')
    .select('whatsapp_notifications_enabled')
    .eq('id', profile.church_id)
    .single()

  if (error || !data) {
    logger.error('[notification-settings GET]', { module: 'churches', churchId: profile.church_id, error })
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }

  return NextResponse.json({
    whatsapp_notifications_enabled: data.whatsapp_notifications_enabled === true,
  })
}, { requireRoles: ['super_admin'] })

// PUT /api/churches/notification-settings
// Authenticated — super_admin only. Updates the church's notification channel settings.
export const PUT = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const settings = validate(NotificationSettingsSchema, body)

  const { error } = await supabase
    .from('churches')
    .update({ whatsapp_notifications_enabled: settings.whatsapp_notifications_enabled })
    .eq('id', profile.church_id)

  if (error) {
    logger.error('[notification-settings PUT]', { module: 'churches', churchId: profile.church_id, error })
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  revalidateTag(`church-${profile.church_id}`)
  return NextResponse.json({ success: true })
}, { requireRoles: ['super_admin'] })
