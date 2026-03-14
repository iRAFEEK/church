import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { logger } from '@/lib/logger'
import { validate } from '@/lib/api/validate'
import { CreateFiscalYearSchema } from '@/lib/schemas/fiscal-year'

// GET /api/finance/fiscal-years
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('id, name, name_ar, start_date, end_date, is_current')
    .eq('church_id', profile.church_id)
    .order('start_date', { ascending: false })

  if (error) {
    logger.error('[/api/finance/fiscal-years GET]', { module: 'finance', error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/fiscal-years
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(CreateFiscalYearSchema, body)

  if (validated.is_current) {
    // Use atomic RPC to switch current fiscal year
    // First insert, then activate atomically
    const { data: inserted, error: insertError } = await supabase
      .from('fiscal_years')
      .insert({
        name: validated.name,
        name_ar: validated.name_ar,
        start_date: validated.start_date,
        end_date: validated.end_date,
        is_current: false, // Will be set atomically
        church_id: profile.church_id,
      })
      .select('id, name, name_ar, start_date, end_date, is_current')
      .single()

    if (insertError) throw insertError

    // Atomically activate this fiscal year (deactivates all others)
    const { data, error } = await supabase.rpc('activate_fiscal_year', {
      p_church_id: profile.church_id,
      p_fiscal_year_id: inserted.id,
    })

    if (error) throw error

    revalidateTag(`dashboard-${profile.church_id}`)
    return Response.json({ data }, { status: 201 })
  }

  // Non-current fiscal year — simple insert
  const { data, error } = await supabase
    .from('fiscal_years')
    .insert({
      name: validated.name,
      name_ar: validated.name_ar,
      start_date: validated.start_date,
      end_date: validated.end_date,
      is_current: false,
      church_id: profile.church_id,
    })
    .select('id, name, name_ar, start_date, end_date, is_current')
    .single()

  if (error) {
    logger.error('[/api/finance/fiscal-years POST]', { module: 'finance', error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_finances'] })
