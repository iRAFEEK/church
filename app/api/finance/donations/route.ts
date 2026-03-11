import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/finance/donations
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
  if (!perms.can_manage_donations && !perms.can_view_finances) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const donorId = searchParams.get('donor_id')
  const fundId = searchParams.get('fund_id')
  const campaignId = searchParams.get('campaign_id')
  const batchId = searchParams.get('batch_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const method = searchParams.get('payment_method')

  let query = supabase
    .from('donations')
    .select(`
      *,
      donor:donor_id ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      fund:fund_id ( id, name, name_ar ),
      campaign:campaign_id ( id, name, name_ar )
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('donation_date', { ascending: false })
    .range(from, to)

  if (donorId) query = query.eq('donor_id', donorId)
  if (fundId) query = query.eq('fund_id', fundId)
  if (campaignId) query = query.eq('campaign_id', campaignId)
  if (batchId) query = query.eq('batch_id', batchId)
  if (dateFrom) query = query.gte('donation_date', dateFrom)
  if (dateTo) query = query.lte('donation_date', dateTo)
  if (method) query = query.eq('payment_method', method)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  })
}

// POST /api/finance/donations — record single donation
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
  if (!perms.can_manage_donations) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Calculate base_amount if not provided
  const exchangeRate = body.exchange_rate || 1.0
  const baseAmount = body.base_amount ?? body.amount * exchangeRate

  const { data, error } = await supabase
    .from('donations')
    .insert({
      ...body,
      church_id: profile.church_id,
      base_amount: baseAmount,
      exchange_rate: exchangeRate,
      created_by: user.id,
    })
    .select(`
      *,
      donor:donor_id ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      fund:fund_id ( id, name, name_ar )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
