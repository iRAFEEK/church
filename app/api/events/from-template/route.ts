import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// POST /api/events/from-template — create event from a template
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
  if (!perms.can_manage_events) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { template_id, starts_at, ends_at, overrides, custom_field_values } = await req.json()

  if (!template_id || !starts_at) {
    return NextResponse.json({ error: 'template_id and starts_at are required' }, { status: 400 })
  }

  // Fetch template with needs and segments
  const { data: template } = await supabase
    .from('event_templates')
    .select('id, title, title_ar, description, description_ar, event_type, location, capacity, is_public, registration_required, custom_fields')
    .eq('id', template_id)
    .eq('church_id', profile.church_id)
    .single()

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const [{ data: templateNeeds }, { data: templateSegments }] = await Promise.all([
    supabase
      .from('event_template_needs')
      .select('ministry_id, group_id, volunteers_needed, notes, notes_ar, role_presets')
      .eq('template_id', template_id),
    supabase
      .from('event_template_segments')
      .select('title, title_ar, duration_minutes, ministry_id, assigned_to, notes, notes_ar, sort_order')
      .eq('template_id', template_id)
      .order('sort_order', { ascending: true }),
  ])

  // Create event from template fields
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      church_id: profile.church_id,
      created_by: user.id,
      title: template.title,
      title_ar: template.title_ar,
      description: template.description,
      description_ar: template.description_ar,
      event_type: template.event_type,
      location: template.location,
      capacity: template.capacity,
      is_public: template.is_public,
      registration_required: template.registration_required,
      starts_at,
      ends_at: ends_at || null,
      status: 'draft',
      custom_field_values: custom_field_values || {},
      ...overrides,
    })
    .select()
    .single()

  if (eventError) {
    console.error('[/api/events/from-template POST]', eventError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Copy service needs
  if (templateNeeds && templateNeeds.length > 0) {
    const needRows = templateNeeds.map((n: any) => ({
      event_id: event.id,
      church_id: profile.church_id,
      ministry_id: n.ministry_id,
      group_id: n.group_id,
      volunteers_needed: n.volunteers_needed,
      notes: n.notes,
      notes_ar: n.notes_ar,
      role_presets: n.role_presets || [],
    }))
    await supabase.from('event_service_needs').insert(needRows)
  }

  // Copy segments
  if (templateSegments && templateSegments.length > 0) {
    const segRows = templateSegments.map((s: any) => ({
      event_id: event.id,
      church_id: profile.church_id,
      title: s.title,
      title_ar: s.title_ar,
      duration_minutes: s.duration_minutes,
      ministry_id: s.ministry_id,
      assigned_to: s.assigned_to,
      notes: s.notes,
      notes_ar: s.notes_ar,
      sort_order: s.sort_order,
    }))
    await supabase.from('event_segments').insert(segRows)
  }

  return NextResponse.json({ data: event }, { status: 201 })
}
