import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// GET /api/templates — list templates for church
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('event_templates')
    .select(`
      *,
      event_template_needs(id),
      event_template_segments(id)
    `)
    .eq('church_id', profile.church_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data || []).map((t: any) => ({
    ...t,
    needs_count: t.event_template_needs?.length || 0,
    segments_count: t.event_template_segments?.length || 0,
    event_template_needs: undefined,
    event_template_segments: undefined,
  }))

  return NextResponse.json({ data: enriched }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

// POST /api/templates — create template with needs and segments (admin only)
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
  if (!perms.can_manage_templates) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { needs, segments, ...templateFields } = await req.json()

  // Create template
  const { data: template, error } = await supabase
    .from('event_templates')
    .insert({
      ...templateFields,
      church_id: profile.church_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert needs
  if (Array.isArray(needs) && needs.length > 0) {
    const needRows = needs.map((n: any) => ({
      template_id: template.id,
      church_id: profile.church_id,
      ministry_id: n.ministry_id || null,
      group_id: n.group_id || null,
      volunteers_needed: n.volunteers_needed || 1,
      notes: n.notes || null,
      notes_ar: n.notes_ar || null,
      role_presets: n.role_presets || [],
    }))
    await supabase.from('event_template_needs').insert(needRows)
  }

  // Insert segments
  if (Array.isArray(segments) && segments.length > 0) {
    const segRows = segments.map((s: any, i: number) => ({
      template_id: template.id,
      church_id: profile.church_id,
      title: s.title,
      title_ar: s.title_ar || null,
      duration_minutes: s.duration_minutes || null,
      ministry_id: s.ministry_id || null,
      assigned_to: s.assigned_to || null,
      notes: s.notes || null,
      notes_ar: s.notes_ar || null,
      sort_order: i,
    }))
    await supabase.from('event_template_segments').insert(segRows)
  }

  return NextResponse.json({ data: template }, { status: 201 })
}
