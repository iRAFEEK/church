import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/templates/[id]/segments — list segments ordered
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params
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
    .from('event_template_segments')
    .select(`
      *,
      ministry:ministry_id(id, name, name_ar),
      profile:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar)
    `)
    .eq('template_id', templateId)
    .eq('church_id', profile.church_id)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

// PUT /api/templates/[id]/segments — replace all segments
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['super_admin', 'ministry_leader'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { segments } = await req.json()
  if (!Array.isArray(segments)) {
    return NextResponse.json({ error: 'segments must be an array' }, { status: 400 })
  }

  // Delete existing
  await supabase
    .from('event_template_segments')
    .delete()
    .eq('template_id', templateId)
    .eq('church_id', profile.church_id)

  // Insert new
  if (segments.length > 0) {
    const rows = segments.map((s: any, i: number) => ({
      template_id: templateId,
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

    const { error } = await supabase.from('event_template_segments').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
