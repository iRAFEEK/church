import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/templates/[id] — get template with needs and segments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: template, error } = await supabase
    .from('event_templates')
    .select(`
      *,
      event_template_needs(
        id, ministry_id, group_id, volunteers_needed, notes, notes_ar, role_presets,
        ministry:ministry_id(id, name, name_ar),
        group:group_id(id, name, name_ar)
      ),
      event_template_segments(
        id, title, title_ar, duration_minutes, ministry_id, assigned_to, notes, notes_ar, sort_order,
        ministry:ministry_id(id, name, name_ar),
        profile:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar)
      )
    `)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Sort segments by sort_order
  if (template.event_template_segments) {
    template.event_template_segments.sort((a: any, b: any) => a.sort_order - b.sort_order)
  }

  return NextResponse.json({
    data: {
      ...template,
      needs: template.event_template_needs || [],
      segments: template.event_template_segments || [],
      event_template_needs: undefined,
      event_template_segments: undefined,
    },
  })
}

// PATCH /api/templates/[id] — update template fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  if (!perms.can_manage_templates) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('event_templates')
    .update(body)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/templates/[id] — soft-delete template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  if (!perms.can_manage_templates) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('event_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('church_id', profile.church_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
