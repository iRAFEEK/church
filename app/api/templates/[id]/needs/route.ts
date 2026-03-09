import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveApiPermissions } from '@/lib/auth'

// PUT /api/templates/[id]/needs — replace all template needs
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
    .select('church_id, role, permissions')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const perms = await resolveApiPermissions(supabase, profile)
  if (!perms.can_manage_templates) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { needs } = await req.json()
  if (!Array.isArray(needs)) {
    return NextResponse.json({ error: 'needs must be an array' }, { status: 400 })
  }

  // Delete existing needs
  await supabase
    .from('event_template_needs')
    .delete()
    .eq('template_id', templateId)
    .eq('church_id', profile.church_id)

  // Insert new needs
  if (needs.length > 0) {
    const rows = needs.map((n: any) => ({
      template_id: templateId,
      church_id: profile.church_id,
      ministry_id: n.ministry_id || null,
      group_id: n.group_id || null,
      volunteers_needed: n.volunteers_needed || 1,
      notes: n.notes || null,
      notes_ar: n.notes_ar || null,
      role_presets: n.role_presets || [],
    }))

    const { error } = await supabase.from('event_template_needs').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
