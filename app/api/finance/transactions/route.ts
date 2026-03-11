import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_view_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const fund_id = searchParams.get('fund_id')
  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  let query = supabase
    .from('financial_transactions')
    .select('*, created_by_profile:profiles!created_by(full_name)', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (fund_id) query = query.eq('fund_id', fund_id)
  if (date_from) query = query.gte('transaction_date', date_from)
  if (date_to) query = query.lte('transaction_date', date_to)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, permissions').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { line_items, ...txnData } = body

  // Validate balanced journal entry
  if (line_items && line_items.length > 0) {
    const totalDebits = line_items.reduce((s: number, l: any) => s + (l.debit_amount || 0), 0)
    const totalCredits = line_items.reduce((s: number, l: any) => s + (l.credit_amount || 0), 0)
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({ error: 'Journal entry must be balanced (debits = credits)' }, { status: 422 })
    }
  }

  const { data: txn, error: txnError } = await supabase
    .from('financial_transactions')
    .insert({ ...txnData, church_id: profile.church_id, created_by: user.id, status: 'draft' })
    .select()
    .single()

  if (txnError) return NextResponse.json({ error: txnError.message }, { status: 500 })

  if (line_items && line_items.length > 0) {
    const items = line_items.map((l: any) => ({
      ...l,
      transaction_id: txn.id,
      church_id: profile.church_id,
    }))
    const { error: lineError } = await supabase.from('transaction_line_items').insert(items)
    if (lineError) return NextResponse.json({ error: lineError.message }, { status: 500 })
  }

  return NextResponse.json({ data: txn }, { status: 201 })
}
