import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateFiscalYearSchema } from '@/lib/schemas/fiscal-year'

// GET /api/finance/fiscal-years
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('fiscal_years')
    .select('id, name, start_date, end_date, is_current')
    .eq('church_id', profile.church_id)
    .order('start_date', { ascending: false })

  if (error) throw error
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/fiscal-years
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(CreateFiscalYearSchema, body)

  // If setting as current, unset previous current
  if (validated.is_current) {
    await supabase
      .from('fiscal_years')
      .update({ is_current: false })
      .eq('church_id', profile.church_id)
      .eq('is_current', true)
  }

  const { data, error } = await supabase
    .from('fiscal_years')
    .insert({
      name: validated.name,
      name_ar: validated.name_ar,
      start_date: validated.start_date,
      end_date: validated.end_date,
      is_current: validated.is_current,
      church_id: profile.church_id,
    })
    .select('id, name, start_date, end_date, is_current')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_finances'] })
