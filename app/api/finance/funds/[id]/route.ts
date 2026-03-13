import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateFundSchema } from '@/lib/schemas/fund'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase.from('funds').select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order, currency').eq('id', id).eq('church_id', profile.church_id).single()
  if (error) {
    console.error('[/api/finance/funds/[id] GET]', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (body.is_default) {
    await supabase.from('funds').update({ is_default: false }).eq('church_id', profile.church_id).eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('funds')
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order, currency')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    console.error('[/api/finance/funds/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ data })
}, { requirePermissions: ['can_manage_finances'] })

// DELETE /api/finance/funds/[id] — soft delete
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('funds')
    .update({ is_active: false })
    .eq('id', id)
    .eq('church_id', profile.church_id)

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Soft delete
  const { error } = await supabase.from('funds').update({ is_active: false }).eq('id', id).eq('church_id', profile.church_id)
  if (error) {
    console.error('[/api/finance/funds/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return Response.json({ success: true })
}, { requirePermissions: ['can_manage_finances'] })
