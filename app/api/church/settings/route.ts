import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/church/settings
export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data, error } = await supabase
    .from('churches')
    .select('default_currency, supported_currencies, fiscal_year_start_month, financial_approval_required, donation_receipt_enabled, online_giving_enabled')
    .eq('id', profile.church_id)
    .single()

  if (error) throw error
  return { data }
}, { cache: 'private, max-age=300, stale-while-revalidate=600' })

// PATCH /api/church/settings
export const PATCH = apiHandler(async ({ req, profile }) => {
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
    .select('default_currency, supported_currencies, fiscal_year_start_month, financial_approval_required, donation_receipt_enabled, online_giving_enabled')
    .single()

  if (error) throw error
  revalidateTag(`dashboard-${profile.church_id}`)
  return { data }
}, { requirePermissions: ['can_manage_finances'] })
