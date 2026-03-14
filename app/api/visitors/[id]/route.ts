import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateVisitorSchema } from '@/lib/schemas/visitor'
import { createAdminClient } from '@/lib/supabase/server'
import { notifyVisitorAssigned } from '@/lib/messaging/triggers'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

// GET /api/visitors/[id] — authenticated
export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const id = params!.id

  const { data, error } = await supabase
    .from('visitors')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, email, status, age_range, occupation, how_heard, contact_notes, contacted_at, visited_at, created_at, assigned_to, converted_to, assigned_profile:assigned_to(id,first_name,last_name,first_name_ar,last_name_ar,photo_url,phone)')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return { data }
})

// PATCH /api/visitors/[id] — authenticated, admin/leader only
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const id = params!.id
  const body = await req.json()
  const { action, ...updates } = body

  // Handle special actions
  if (action === 'assign') {
    const { assigned_to } = updates
    if (!assigned_to || typeof assigned_to !== 'string') {
      return NextResponse.json({ error: 'assigned_to is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('visitors')
      .update({ assigned_to, status: 'assigned' })
      .eq('id', id)
      .eq('church_id', profile.church_id)
      .select('id, first_name, last_name, status, assigned_to, church_id')
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Notify the assigned leader
    notifyVisitorAssigned(id, assigned_to, data.church_id).catch((err) =>
      logger.error('notifyVisitorAssigned fire-and-forget failed', { module: 'visitors', churchId: data.church_id, error: err })
    )

    return { data }
  }

  if (action === 'contact') {
    const { contact_notes } = updates
    const { data, error } = await supabase
      .from('visitors')
      .update({ contact_notes, contacted_at: new Date().toISOString(), status: 'contacted' })
      .eq('id', id)
      .eq('church_id', profile.church_id)
      .select('id, first_name, last_name, status, contact_notes, contacted_at')
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return { data }
  }

  if (action === 'convert') {
    // Convert visitor to member profile — requires admin client
    const adminSupabase = await createAdminClient()

    // Get visitor data — filter by both id AND church_id
    const { data: visitor, error: vErr } = await adminSupabase
      .from('visitors')
      .select('id, church_id, first_name, last_name, phone, email, occupation')
      .eq('id', id)
      .eq('church_id', profile.church_id)
      .single()

    if (vErr || !visitor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Create auth user via admin client
    const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
      email: visitor.email || `visitor+${visitor.id}@placeholder.local`,
      password: Math.random().toString(36).slice(-12),
      user_metadata: { church_id: visitor.church_id },
      email_confirm: true,
    })
    if (authErr) throw authErr

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

    if (profileErr) throw profileErr

    // Mark visitor as converted — filter by church_id
    const { data, error } = await adminSupabase
      .from('visitors')
      .update({ status: 'converted', converted_to: authData.user.id })
      .eq('id', id)
      .eq('church_id', profile.church_id)
      .select('id, first_name, last_name, status, converted_to')
      .single()

    if (error) throw error
    return { data, profile_id: authData.user.id }
  }

  // Generic update — validate with Zod
  const validated = validate(UpdateVisitorSchema, updates)
  const { data, error } = await supabase
    .from('visitors')
    .update(validated)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, first_name, last_name, status, phone, email, assigned_to')
    .single()

  if (error) throw error
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return { data }
}, { requireRoles: ['super_admin', 'ministry_leader', 'group_leader'] })
