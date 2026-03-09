import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePermissions, HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('id, role, permissions, church_id')
    .eq('id', targetId)
    .eq('church_id', currentProfile.church_id)
    .single()

  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get church role defaults
  const { data: roleDefaultsRow } = await supabase
    .from('role_permission_defaults')
    .select('permissions')
    .eq('church_id', target.church_id)
    .eq('role', target.role)
    .single()

  const churchDefaults = roleDefaultsRow?.permissions ?? null
  const effectiveRoleDefaults = {
    ...HARDCODED_ROLE_DEFAULTS[target.role as keyof typeof HARDCODED_ROLE_DEFAULTS],
    ...(churchDefaults ?? {}),
  }

  const resolved = resolvePermissions(
    target.role as any,
    churchDefaults,
    target.permissions
  )

  return NextResponse.json({
    roleDefaults: effectiveRoleDefaults,
    userOverrides: target.permissions,
    resolved,
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { permissions } = await req.json()

  // Get old value for audit
  const { data: target } = await supabase
    .from('profiles')
    .select('permissions, church_id')
    .eq('id', targetId)
    .eq('church_id', currentProfile.church_id)
    .single()

  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update
  const { error } = await supabase
    .from('profiles')
    .update({ permissions })
    .eq('id', targetId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabase.from('permission_audit_log').insert({
    church_id: currentProfile.church_id,
    changed_by: user.id,
    target_id: targetId,
    change_type: 'user_override',
    old_value: target.permissions,
    new_value: permissions,
  })

  return NextResponse.json({ ok: true })
}
