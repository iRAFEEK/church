import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('churches')
    .select('default_currency, supported_currencies, fiscal_year_start_month, financial_approval_required, donation_receipt_enabled, online_giving_enabled')
    .eq('id', profile.church_id)
    .single()

  if (error) {
    console.error('[/api/church/settings GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = [
    'default_currency', 'supported_currencies', 'fiscal_year_start_month',
    'financial_approval_required', 'donation_receipt_enabled', 'online_giving_enabled',
  ]
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  // Use admin client to bypass RLS (churches UPDATE policy is super_admin-only,
  // but permission check above already enforces can_manage_finances)
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('churches')
    .update(update)
    .eq('id', profile.church_id)
    .select()
    .single()

  if (error) {
    console.error('[/api/church/settings PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data })
}
