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
  if (!perms.can_view_own_giving) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

  const [donationsRes, pledgesRes] = await Promise.all([
    supabase
      .from('donations')
      .select('*, fund:funds(name, name_ar)')
      .eq('donor_id', user.id)
      .eq('church_id', profile.church_id)
      .order('donation_date', { ascending: false }),
    supabase
      .from('pledges')
      .select('*, campaign:campaigns(name, name_ar)')
      .eq('donor_id', user.id)
      .eq('church_id', profile.church_id)
      .eq('status', 'active'),
  ])

  const donations = donationsRes.data || []
  const pledges = pledgesRes.data || []

  const thisMonth = donations
    .filter(d => d.donation_date >= startOfMonth)
    .reduce((s: number, d: any) => s + (d.base_amount || d.amount), 0)

  const thisYear = donations
    .filter(d => d.donation_date >= startOfYear)
    .reduce((s: number, d: any) => s + (d.base_amount || d.amount), 0)

  const allTime = donations.reduce((s: number, d: any) => s + (d.base_amount || d.amount), 0)

  return NextResponse.json({
    data: { donations, pledges, summary: { thisMonth, thisYear, allTime } },
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}
