import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notifyVisitorAssigned } from '@/lib/messaging/triggers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('visitors')
    .select('*, assigned_profile:assigned_to(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, ...updates } = body

  // Handle special actions
  if (action === 'assign') {
    const { assigned_to } = updates
    const { data, error } = await supabase
      .from('visitors')
      .update({ assigned_to, status: 'assigned' })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify the assigned leader
    notifyVisitorAssigned(id, assigned_to, data.church_id).catch(console.error)

    return NextResponse.json({ data })
  }

  if (action === 'contact') {
    const { contact_notes } = updates
    const { data, error } = await supabase
      .from('visitors')
      .update({ contact_notes, contacted_at: new Date().toISOString(), status: 'contacted' })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'convert') {
    // Convert visitor to member profile
    const adminSupabase = await createAdminClient()

    // Get visitor data
    const { data: visitor, error: vErr } = await adminSupabase
      .from('visitors')
      .select('*')
      .eq('id', id)
      .single()
    if (vErr || !visitor) return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })

    // Create auth user via admin client
    const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
      email: visitor.email || `visitor+${visitor.id}@placeholder.local`,
      password: Math.random().toString(36).slice(-12),
      user_metadata: { church_id: visitor.church_id },
      email_confirm: true,
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

    // Update the auto-created profile
    const { error: profileErr } = await adminSupabase
      .from('profiles')
      .update({
        first_name: visitor.first_name,
        last_name: visitor.last_name,
        phone: visitor.phone,
        email: visitor.email,
        occupation: visitor.occupation,
        status: 'active',
        joined_church_at: new Date().toISOString().split('T')[0],
      })
      .eq('id', authData.user.id)

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

    // Mark visitor as converted
    const { data, error } = await adminSupabase
      .from('visitors')
      .update({ status: 'converted', converted_to: authData.user.id })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data, profile_id: authData.user.id })
  }

  // Generic update
  const { data, error } = await supabase
    .from('visitors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
