import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { updateRoleDefaultsSchema } from '@/lib/schemas/permission'
import { HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'
import type { UserRole } from '@/types'

const CONFIGURABLE_ROLES: UserRole[] = ['member', 'group_leader', 'ministry_leader']

export const GET = apiHandler(async ({ supabase, profile }) => {
  const { data: rows } = await supabase
    .from('role_permission_defaults')
    .select('role, permissions')
    .eq('church_id', profile.church_id)

  // Build response: merge hardcoded defaults with church overrides
  const result: Record<string, { hardcoded: Record<string, boolean>; churchOverride: Record<string, boolean> | null; effective: Record<string, boolean> }> = {}
  for (const role of CONFIGURABLE_ROLES) {
    const row = (rows || []).find((r: { role: string }) => r.role === role)
    result[role] = {
      hardcoded: HARDCODED_ROLE_DEFAULTS[role],
      churchOverride: (row?.permissions as Record<string, boolean>) ?? null,
      effective: { ...HARDCODED_ROLE_DEFAULTS[role], ...((row?.permissions as Record<string, boolean>) ?? {}) },
    }
  }

  return result
}, { requireRoles: ['super_admin'] })

export const PUT = apiHandler(async ({ req, supabase, profile, user }) => {
  const body = await req.json()
  const { role, permissions } = validate(updateRoleDefaultsSchema, body)

  // Get old value for audit log
  const { data: existing } = await supabase
    .from('role_permission_defaults')
    .select('permissions')
    .eq('church_id', profile.church_id)
    .eq('role', role)
    .single()

  // Upsert
  const { error } = await supabase
    .from('role_permission_defaults')
    .upsert({
      church_id: profile.church_id,
      role,
      permissions,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: 'church_id,role' })

  if (error) {
    console.error('[/api/permissions/role-defaults PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Audit log
  await supabase.from('permission_audit_log').insert({
    church_id: profile.church_id,
    changed_by: user.id,
    target_role: role,
    change_type: 'role_default',
    old_value: existing?.permissions ?? null,
    new_value: permissions,
  })

  return { ok: true }
}, { requireRoles: ['super_admin'] })
