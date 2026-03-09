import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'
import type { UserRole } from '@/types'

const CONFIGURABLE_ROLES: UserRole[] = ['member', 'group_leader', 'ministry_leader']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: rows } = await supabase
    .from('role_permission_defaults')
    .select('*')
    .eq('church_id', profile.church_id)

  // Build response: merge hardcoded defaults with church overrides
  const result: Record<string, any> = {}
  for (const role of CONFIGURABLE_ROLES) {
    const row = (rows || []).find((r: any) => r.role === role)
    result[role] = {
      hardcoded: HARDCODED_ROLE_DEFAULTS[role],
      churchOverride: row?.permissions ?? null,
      effective: { ...HARDCODED_ROLE_DEFAULTS[role], ...(row?.permissions ?? {}) },
    }
  }

  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { role, permissions } = await req.json()
  if (!CONFIGURABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabase.from('permission_audit_log').insert({
    church_id: profile.church_id,
    changed_by: user.id,
    target_role: role,
    change_type: 'role_default',
    old_value: existing?.permissions ?? null,
    new_value: permissions,
  })

  return NextResponse.json({ ok: true })
}
