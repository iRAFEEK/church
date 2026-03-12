import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/finance/expenses
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
  if (!perms.can_submit_expenses && !perms.can_approve_expenses) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const status = searchParams.get('status')
  const ministryId = searchParams.get('ministry_id')
  const mine = searchParams.get('mine') === 'true'

  let query = supabase
    .from('expense_requests')
    .select(`
      id, description, description_ar, amount, currency, status, vendor_name, vendor_name_ar, request_number, rejection_reason, payment_method, is_reimbursement, notes, created_at,
      requester:requested_by ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      ministry:ministry_id ( id, name, name_ar ),
      fund:fund_id ( id, name, name_ar )
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  // If user can only submit (not approve), show only their own
  if (!perms.can_approve_expenses || mine) {
    query = query.eq('requested_by', user.id)
  }

  if (status) query = query.eq('status', status)
  if (ministryId) query = query.eq('ministry_id', ministryId)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  })
}

// POST /api/finance/expenses — submit expense request
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
  if (!perms.can_submit_expenses) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('expense_requests')
    .insert({
      ...body,
      church_id: profile.church_id,
      requested_by: user.id,
      status: 'submitted',
    })
    .select(`
      *,
      requester:requested_by ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      ministry:ministry_id ( id, name, name_ar )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}
