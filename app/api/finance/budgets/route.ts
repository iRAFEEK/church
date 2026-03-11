import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/finance/budgets
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_budgets && !perms.can_view_finances) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const fiscalYearId = searchParams.get('fiscal_year_id')
  const fundId = searchParams.get('fund_id')
  const ministryId = searchParams.get('ministry_id')

  let query = supabase
    .from('budgets')
    .select(`
      *,
      fiscal_year:fiscal_year_id (id, name, name_ar),
      fund:fund_id (id, name, name_ar),
      ministry:ministry_id (id, name, name_ar)
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (fiscalYearId) query = query.eq('fiscal_year_id', fiscalYearId)
  if (fundId) query = query.eq('fund_id', fundId)
  if (ministryId) query = query.eq('ministry_id', ministryId)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

// POST /api/finance/budgets
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_budgets) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...body, church_id: profile.church_id, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
