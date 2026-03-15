import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { VisitorFormConfigSchema } from '@/lib/schemas/visitor-form-config'
import { logger } from '@/lib/logger'

// GET /api/churches/visitor-form-config?church_id=<uuid>
// Public endpoint — no auth required. Used by the /join page.
export async function GET(req: NextRequest) {
  const churchId = req.nextUrl.searchParams.get('church_id')
  if (!churchId) {
    return NextResponse.json({ error: 'church_id is required' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('churches')
    .select('visitor_form_config, name, name_ar')
    .eq('id', churchId)
    .single()

  if (error || !data) {
    logger.warn('[visitor-form-config GET] Church not found', { module: 'churches', churchId })
    return NextResponse.json({ error: 'Church not found' }, { status: 404 })
  }

  return NextResponse.json({
    config: data.visitor_form_config,
    church_name: data.name,
    church_name_ar: data.name_ar,
  }, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}

// PUT /api/churches/visitor-form-config
// Authenticated — super_admin only. Updates the form config.
export const PUT = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const config = validate(VisitorFormConfigSchema, body)

  const { error } = await supabase
    .from('churches')
    .update({ visitor_form_config: config })
    .eq('id', profile.church_id)

  if (error) {
    logger.error('[visitor-form-config PUT]', { module: 'churches', error })
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  revalidateTag(`church-${profile.church_id}`)
  return NextResponse.json({ success: true })
}, { requireRoles: ['super_admin'] })
