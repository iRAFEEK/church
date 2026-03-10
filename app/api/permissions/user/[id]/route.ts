import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { resolvePermissions, HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.role !== 'super_admin') {
    return NextResponse.json({
      error: 'Forbidden',
      detail: profileError?.message || `role: ${currentProfile?.role}`,
    }, { status: 403 })
  }

  // Try anon client first, then admin client as fallback
  let target: any = null
  let targetError: any = null

  const targetQuery = () => supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email, role, permissions, church_id')
    .eq('id', targetId)
    .eq('church_id', currentProfile.church_id)
    .single()

  const { data: d1, error: e1 } = await targetQuery()
  target = d1
  targetError = e1

  if (!target) {
    // Fallback: try admin client
    try {
      const adminClient = await createAdminClient()
      const { data: d2, error: e2 } = await adminClient
        .from('profiles')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email, role, permissions, church_id')
        .eq('id', targetId)
        .eq('church_id', currentProfile.church_id)
        .single()
      target = d2
      targetError = e2
    } catch (e) {
      // adminClient creation failed
    }
  }

  if (!target) {
    return NextResponse.json({
      error: 'Not found',
      detail: targetError?.message,
      targetId,
      churchId: currentProfile.church_id,
    }, { status: 404 })
  }

  // Get church role defaults (ok if missing)
  const { data: roleDefaultsRow } = await supabase
    .from('role_permission_defaults')
    .select('permissions')
    .eq('church_id', target.church_id)
    .eq('role', target.role)
    .single()

  const churchDefaults = (roleDefaultsRow?.permissions as Record<string, boolean> | null) ?? null
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
    member: {
      id: target.id,
      first_name: target.first_name,
      last_name: target.last_name,
      first_name_ar: target.first_name_ar,
      last_name_ar: target.last_name_ar,
      photo_url: target.photo_url,
      email: target.email,
      role: target.role,
    },
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

  // Get old value for audit — try anon, then admin
  let target: any = null
  let targetError: any = null

  const { data: d1, error: e1 } = await supabase
    .from('profiles')
    .select('permissions, church_id')
    .eq('id', targetId)
    .eq('church_id', currentProfile.church_id)
    .single()
  target = d1
  targetError = e1

  if (!target) {
    try {
      const adminClient = await createAdminClient()
      const { data: d2, error: e2 } = await adminClient
        .from('profiles')
        .select('permissions, church_id')
        .eq('id', targetId)
        .eq('church_id', currentProfile.church_id)
        .single()
      target = d2
      targetError = e2
    } catch {
      // adminClient creation failed
    }
  }

  if (!target) {
    return NextResponse.json({
      error: 'Not found',
      detail: targetError?.message,
      targetId,
      churchId: currentProfile.church_id,
    }, { status: 404 })
  }

  // Update — try admin client first (bypasses RLS), fall back to anon
  let updateError: any = null
  try {
    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ permissions })
      .eq('id', targetId)
      .eq('church_id', currentProfile.church_id)
    updateError = error
  } catch {
    const { error } = await supabase
      .from('profiles')
      .update({ permissions })
      .eq('id', targetId)
      .eq('church_id', currentProfile.church_id)
    updateError = error
  }

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Audit log (best effort)
  try {
    const adminClient = await createAdminClient()
    await adminClient.from('permission_audit_log').insert({
      church_id: currentProfile.church_id,
      changed_by: user.id,
      target_id: targetId,
      change_type: 'user_override',
      old_value: target.permissions,
      new_value: permissions,
    })
  } catch {
    // Don't fail the request for audit log issues
  }

  return NextResponse.json({ ok: true })
}
