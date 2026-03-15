import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateChurchNeedSchema } from '@/lib/schemas/church-need'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/community/needs/[id] — single need with church info
export const GET = apiHandler(async ({ profile, params }) => {
  const { id } = params!
  const admin = await createAdminClient()

  const [needResult, countResult] = await Promise.all([
    admin
      .from('church_needs')
      .select('id, church_id, created_by, title, title_ar, description, description_ar, image_url, category, quantity, urgency, status, contact_name, contact_phone, contact_email, expires_at, fulfilled_at, created_at, updated_at, church:church_id(id, name, name_ar, country, logo_url, denomination)')
      .eq('id', id)
      .single(),
    admin
      .from('church_need_responses')
      .select('id', { count: 'exact', head: true })
      .eq('need_id', id),
  ])

  if (needResult.error || !needResult.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const need = { ...needResult.data, response_count: countResult.count || 0 }

  // Strip contact PII from needs owned by other churches,
  // unless the caller's church has an accepted response
  if (need.church_id !== profile.church_id) {
    let hasAcceptedResponse = false
    const { data: acceptedResp } = await admin
      .from('church_need_responses')
      .select('id')
      .eq('need_id', id)
      .eq('responder_church_id', profile.church_id)
      .eq('status', 'accepted')
      .limit(1)

    if (acceptedResp && acceptedResp.length > 0) {
      hasAcceptedResponse = true
    }

    if (!hasAcceptedResponse) {
      delete (need as Record<string, unknown>).contact_name
      delete (need as Record<string, unknown>).contact_phone
      delete (need as Record<string, unknown>).contact_email
    }
  }

  return { data: need }
}, { requirePermissions: ['can_view_church_needs'] })

// PATCH /api/community/needs/[id] — update own need
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const { id } = params!
  const body = await req.json()
  const validated = validate(UpdateChurchNeedSchema, body)

  // Verify ownership
  const { data: existing } = await supabase
    .from('church_needs')
    .select('church_id')
    .eq('id', id)
    .single()

  if (!existing || existing.church_id !== profile.church_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updateData: Record<string, unknown> = { ...validated }
  if (validated.status === 'fulfilled') {
    updateData.fulfilled_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('church_needs')
    .update(updateData)
    .eq('id', id)
    .select('id, church_id, title, title_ar, description, description_ar, image_url, category, quantity, urgency, status, contact_name, contact_phone, contact_email, expires_at, fulfilled_at, created_at, updated_at')
    .single()

  if (error) throw error
  revalidateTag('church-needs')
  return { data }
}, { requirePermissions: ['can_manage_church_needs'] })

// DELETE /api/community/needs/[id] — delete own need
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const { id } = params!

  const { error } = await supabase
    .from('church_needs')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) throw error
  revalidateTag('church-needs')
  return { success: true }
}, { requirePermissions: ['can_manage_church_needs'], requireRoles: ['super_admin'] })
