import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateAccountSchema } from '@/lib/schemas/account'

// GET /api/finance/accounts
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const activeOnly = searchParams.get('active') !== 'false'
  const headersOnly = searchParams.get('headers_only') === 'true'
  const postableOnly = searchParams.get('postable') === 'true'

  let query = supabase
    .from('accounts')
    .select('id, code, name, name_ar, account_type, account_sub_type, current_balance, currency, is_header, is_active, parent_id, display_order')
    .eq('church_id', profile.church_id)
    .order('display_order', { ascending: true })
    .order('code', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)
  if (type) query = query.eq('account_type', type)
  if (headersOnly) query = query.eq('is_header', true)
  if (postableOnly) query = query.eq('is_header', false)

  const { data, error } = await query
  if (error) throw error
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/accounts
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(CreateAccountSchema, body)

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      code: validated.code,
      name: validated.name,
      name_ar: validated.name_ar,
      account_type: validated.account_type,
      account_sub_type: validated.account_sub_type,
      currency: validated.currency,
      is_header: validated.is_header,
      is_active: validated.is_active,
      parent_id: validated.parent_id,
      display_order: validated.display_order,
      church_id: profile.church_id,
    })
    .select('id, code, name, name_ar, account_type, account_sub_type, currency, is_header, is_active, parent_id, display_order')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  revalidateTag(`accounts-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}
