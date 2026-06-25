import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { PrivacySettingsSchema } from '@/lib/schemas/privacy-settings'
import { logger } from '@/lib/logger'

// GET /api/churches/privacy-settings
// Authenticated — super_admin only. Returns the church's member-directory privacy settings.
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('churches')
    .select('member_directory_visibility')
    .eq('id', profile.church_id)
    .single()

  if (error || !data) {
    logger.error('[privacy-settings GET]', { module: 'churches', churchId: profile.church_id, error })
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }

  return NextResponse.json({
    member_directory_visibility: data.member_directory_visibility ?? 'leaders_only',
  })
}, { requireRoles: ['super_admin'] })

// PUT /api/churches/privacy-settings
// Authenticated — super_admin only. Updates the church's member-directory privacy settings.
export const PUT = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const settings = validate(PrivacySettingsSchema, body)

  const { error } = await supabase
    .from('churches')
    .update({ member_directory_visibility: settings.member_directory_visibility })
    .eq('id', profile.church_id)

  if (error) {
    logger.error('[privacy-settings PUT]', { module: 'churches', churchId: profile.church_id, error })
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  revalidateTag(`church-${profile.church_id}`)
  return NextResponse.json({ success: true })
}, { requireRoles: ['super_admin'] })
