import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateDonationSchema } from '@/lib/schemas/donation'

// GET /api/finance/donations
export const GET = apiHandler(async ({ req, supabase, profile }) => {
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
      id, amount, base_amount, currency, donation_date, payment_method, receipt_number, check_number, is_anonymous, is_tithe, is_tax_deductible, notes, created_at,
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
  if (error) {
    console.error('[/api/finance/donations GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
  })
}, { requirePermissions: ['can_view_finances'] })

// POST /api/finance/donations — record single donation
export const POST = apiHandler(async ({ req, supabase, user, profile }) => {
  const body = await req.json()
  const validated = validate(CreateDonationSchema, body)

  const baseAmount = validated.amount * (validated.exchange_rate ?? 1)

  const { data, error } = await supabase
    .from('donations')
    .insert({
      amount: validated.amount,
      currency: validated.currency,
      donation_date: validated.donation_date,
      payment_method: validated.payment_method,
      donor_id: validated.donor_id,
      fund_id: validated.fund_id,
      campaign_id: validated.campaign_id,
      batch_id: validated.batch_id,
      receipt_number: validated.receipt_number,
      check_number: validated.check_number,
      exchange_rate: validated.exchange_rate,
      base_amount: baseAmount,
      is_anonymous: validated.is_anonymous,
      is_tithe: validated.is_tithe,
      is_tax_deductible: validated.is_tax_deductible,
      notes: validated.notes,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select(`
      id, amount, base_amount, currency, donation_date, payment_method, receipt_number, check_number, is_anonymous, is_tithe, is_tax_deductible, notes, created_at,
      donor:donor_id ( id, first_name, last_name, first_name_ar, last_name_ar, photo_url ),
      fund:fund_id ( id, name, name_ar )
    `)
    .single()

  if (error) {
    console.error('[/api/finance/donations POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  revalidateTag(`funds-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}, { requirePermissions: ['can_manage_finances'] })
