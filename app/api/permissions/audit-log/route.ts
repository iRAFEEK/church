import { apiHandler } from '@/lib/api/handler'
import { NextResponse } from 'next/server'

export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data: logs, count } = await supabase
    .from('permission_audit_log')
    .select(`
      id, church_id, changed_by, target_id, target_role, change_type, old_value, new_value, created_at,
      changed_by_profile:changed_by(first_name, last_name, first_name_ar, last_name_ar),
      target_profile:target_id(first_name, last_name, first_name_ar, last_name_ar)
    `, { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({ logs: logs || [], total: count || 0 })
}, { requireRoles: ['super_admin'] })
