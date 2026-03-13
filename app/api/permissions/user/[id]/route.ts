import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { updateUserPermissionsSchema } from '@/lib/schemas/permission'
import { createAdminClient } from '@/lib/supabase/server'
import { resolvePermissions, HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'
import type { PermissionMap } from '@/types'

export const GET = apiHandler(async ({ supabase, profile, params }) => {
  const targetId = params?.id
  if (!targetId) return Response.json({ error: 'Not found' }, { status: 404 })

  // Try anon client first, then admin client as fallback
  let target: {
    id: string; first_name: string; last_name: string;
    first_name_ar: string | null; last_name_ar: string | null;
    photo_url: string | null; email: string | null;
    role: string; permissions: PermissionMap | null; church_id: string;
  } | null = null

  const selectFields = 'id, first_name, last_name, first_name_ar, last_name_ar, photo_url, email, role, permissions, church_id'

  const { data: d1 } = await supabase
    .from('profiles')
    .select(selectFields)
    .eq('id', targetId)
    .eq('church_id', profile.church_id)
    .single()
  target = d1

  if (!target) {
    // Fallback: try admin client
    try {
      const adminClient = await createAdminClient()
      const { data: d2 } = await adminClient
        .from('profiles')
        .select(selectFields)
        .eq('id', targetId)
        .eq('church_id', profile.church_id)
        .single()
      target = d2
    } catch {
      // adminClient creation failed
    }
  }

  if (!target) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Get church role defaults
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
    target.role as keyof typeof HARDCODED_ROLE_DEFAULTS,
    churchDefaults,
    target.permissions
  )

  return {
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
  }
}, { requireRoles: ['super_admin'] })

export const PUT = apiHandler(async ({ req, supabase, profile, user, params }) => {
  const targetId = params?.id
  if (!targetId) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { permissions } = validate(updateUserPermissionsSchema, body)

  // Get old value for audit — try anon, then admin
  let target: { permissions: PermissionMap | null; church_id: string } | null = null

  const { data: d1 } = await supabase
    .from('profiles')
    .select('permissions, church_id')
    .eq('id', targetId)
    .eq('church_id', profile.church_id)
    .single()
  target = d1

  if (!target) {
    try {
      const adminClient = await createAdminClient()
      const { data: d2 } = await adminClient
        .from('profiles')
        .select('permissions, church_id')
        .eq('id', targetId)
        .eq('church_id', profile.church_id)
        .single()
      target = d2
    } catch {
      // adminClient creation failed
    }
  }

  if (!target) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Update — try admin client first (bypasses RLS), fall back to anon
  let updateError: Error | null = null
  try {
    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ permissions })
      .eq('id', targetId)
      .eq('church_id', profile.church_id)
    if (error) updateError = error
  } catch {
    const { error } = await supabase
      .from('profiles')
      .update({ permissions })
      .eq('id', targetId)
      .eq('church_id', profile.church_id)
    if (error) updateError = error
  }

  if (updateError) {
    console.error('[/api/permissions/user/[id] PUT]', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Audit log (best effort)
  try {
    const adminClient = await createAdminClient()
    await adminClient.from('permission_audit_log').insert({
      church_id: profile.church_id,
      changed_by: user.id,
      target_id: targetId,
      change_type: 'user_override',
      old_value: target.permissions,
      new_value: permissions,
    })
  } catch {
    // Don't fail the request for audit log issues
  }

  return { ok: true }
}, { requireRoles: ['super_admin'] })
