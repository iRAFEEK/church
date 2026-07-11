import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { createAdminClient } from '@/lib/supabase/server'
import { isPlatformAdmin, isEnvPlatformAdmin } from '@/lib/platform'
import { logger } from '@/lib/logger'

// Manage the runtime approver allowlist (platform_admins, migration 087). Gated by
// isPlatformAdmin (env bootstrap OR table) — NOT church role. The env-var "owner(s)" are
// listed but cannot be removed here; they are the un-removable bootstrap.

const addSchema = z.object({ email: z.string().email() })
const removeSchema = z.object({ email: z.string().email() })

export type ApproverRow = { email: string; source: 'env' | 'table'; removable: boolean }

function envOwners(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

async function listApprovers(): Promise<ApproverRow[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('platform_admins')
    .select('email')
    .order('created_at', { ascending: true })
    .limit(200)

  const owners = envOwners()
  const ownerRows: ApproverRow[] = owners.map((email) => ({ email, source: 'env', removable: false }))
  const tableRows: ApproverRow[] = (data ?? [])
    .map((r) => r.email as string)
    .filter((email) => !owners.includes(email)) // env owner takes precedence, no dupes
    .map((email) => ({ email, source: 'table', removable: true }))

  return [...ownerRows, ...tableRows]
}

// GET — list every approver (env owners + table-managed)
export const GET = apiHandler(async ({ user }) => {
  if (!(await isPlatformAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ admins: await listApprovers() })
}, { rateLimit: 'relaxed' })

// POST — grant approval rights to an email
export const POST = apiHandler(async ({ req, user }) => {
  if (!(await isPlatformAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { email } = validate(addSchema, await req.json())
  const normalized = email.trim().toLowerCase()

  // Env owners are already admins — idempotent no-op (nothing to store).
  if (!isEnvPlatformAdmin(normalized)) {
    const admin = await createAdminClient()
    const { error } = await admin
      .from('platform_admins')
      .upsert({ email: normalized, added_by: user.email }, { onConflict: 'email' })
    if (error) {
      logger.error('[/api/platform/admins POST] insert failed', { module: 'platform', error })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  return NextResponse.json({ admins: await listApprovers() })
}, { rateLimit: 'strict' })

// DELETE — revoke a table-managed approver (env owners are protected)
export const DELETE = apiHandler(async ({ req, user }) => {
  if (!(await isPlatformAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { email } = validate(removeSchema, await req.json())
  const normalized = email.trim().toLowerCase()

  if (isEnvPlatformAdmin(normalized)) {
    return NextResponse.json({ error: 'The bootstrap owner cannot be removed' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const { error } = await admin.from('platform_admins').delete().eq('email', normalized)
  if (error) {
    logger.error('[/api/platform/admins DELETE] delete failed', { module: 'platform', error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ admins: await listApprovers() })
}, { rateLimit: 'strict' })
