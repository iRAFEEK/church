import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateDonationSchema } from '@/lib/schemas/donation'

// GET /api/finance/donations/[id]
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('donations')
    .select(`
      id, amount, base_amount, currency, donation_date, payment_method, receipt_number, check_number, is_anonymous, is_tithe, is_tax_deductible, notes, exchange_rate, created_at,
      donor:donor_id (id, first_name, last_name, first_name_ar, last_name_ar, photo_url),
      fund:fund_id (id, name, name_ar),
      campaign:campaign_id (id, name, name_ar)
    `)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) {
    console.error('[/api/finance/donations/[id] GET]', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}, { requirePermissions: ['can_view_finances'] })

// PATCH /api/finance/donations/[id]
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const validated = validate(UpdateDonationSchema, body)

  // Build explicit update object — never spread raw body
  const updateData: Record<string, unknown> = {}
  if (validated.amount !== undefined) updateData.amount = validated.amount
  if (validated.currency !== undefined) updateData.currency = validated.currency
  if (validated.donation_date !== undefined) updateData.donation_date = validated.donation_date
  if (validated.payment_method !== undefined) updateData.payment_method = validated.payment_method
  if (validated.donor_id !== undefined) updateData.donor_id = validated.donor_id
  if (validated.fund_id !== undefined) updateData.fund_id = validated.fund_id
  if (validated.campaign_id !== undefined) updateData.campaign_id = validated.campaign_id
  if (validated.batch_id !== undefined) updateData.batch_id = validated.batch_id
  if (validated.receipt_number !== undefined) updateData.receipt_number = validated.receipt_number
  if (validated.check_number !== undefined) updateData.check_number = validated.check_number
  if (validated.exchange_rate !== undefined) updateData.exchange_rate = validated.exchange_rate
  if (validated.is_anonymous !== undefined) updateData.is_anonymous = validated.is_anonymous
  if (validated.is_tithe !== undefined) updateData.is_tithe = validated.is_tithe
  if (validated.is_tax_deductible !== undefined) updateData.is_tax_deductible = validated.is_tax_deductible
  if (validated.notes !== undefined) updateData.notes = validated.notes

  // Recalculate base_amount if amount or exchange_rate changed
  if (validated.amount !== undefined || validated.exchange_rate !== undefined) {
    const amount = validated.amount
    const rate = validated.exchange_rate
    if (amount !== undefined && rate !== undefined) {
      updateData.base_amount = amount * rate
    }
  }

  const { data, error } = await supabase
    .from('donations')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, amount, base_amount, currency, donation_date, payment_method, receipt_number, notes, created_at')
    .single()

  if (error) {
    console.error('[/api/finance/donations/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  revalidateTag(`funds-${profile.church_id}`)
  return NextResponse.json({ data })
}

// DELETE /api/finance/donations/[id]
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { error } = await supabase
    .from('donations')
    .delete()
    .eq('id', id)
    .eq('church_id', profile.church_id)

  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_finances) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('donations').delete().eq('id', id).eq('church_id', profile.church_id)
  if (error) {
    console.error('[/api/finance/donations/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  revalidateTag(`funds-${profile.church_id}`)
  return NextResponse.json({ success: true })
}
