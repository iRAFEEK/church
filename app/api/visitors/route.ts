import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateVisitorSchema } from '@/lib/schemas/visitor'
import { notifyWelcomeVisitor } from '@/lib/messaging/triggers'
import { rateLimitPublic } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

// POST /api/visitors — public, no auth required (QR visitor form)
// Cannot use apiHandler because this is a public endpoint with no session.
export async function POST(req: NextRequest) {
  const limited = rateLimitPublic(req)
  if (limited) return limited

  try {
    const raw = await req.json()
    const body = validate(CreateVisitorSchema, raw)

    // Use admin client — public form has no session
    const supabase = await createAdminClient()

    // Resolve church_id: use provided or fall back to first active church
    let resolvedChurchId = body.church_id
    if (!resolvedChurchId) {
      const { data: church } = await supabase
        .from('churches')
        .select('id')
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
        .single()
      resolvedChurchId = church?.id
    }

    if (!resolvedChurchId) {
      return NextResponse.json({ error: 'No active church found' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('visitors')
      .insert({
        church_id: resolvedChurchId,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone || null,
        email: body.email || null,
        age_range: body.age_range || null,
        occupation: body.occupation || null,
        how_heard: body.how_heard || null,
      })
      .select('id, church_id, first_name, last_name, status, created_at')
      .single()

    if (error) throw error

    // Fire-and-forget: send welcome WhatsApp to visitor
    notifyWelcomeVisitor(data.id, resolvedChurchId).catch((err) =>
      logger.error('notifyWelcomeVisitor fire-and-forget failed', { module: 'visitors', churchId: resolvedChurchId, error: err })
    )

    revalidateTag(`dashboard-${resolvedChurchId}`)
    return NextResponse.json({ data }, { status: 201 })
  } catch (e: unknown) {
    // ValidationError from validate() has a structured message
    if (e instanceof Error && e.name === 'ValidationError') {
      const ve = e as Error & { fields?: Record<string, string> }
      return NextResponse.json({ error: e.message, fields: ve.fields }, { status: 422 })
    }
    logger.error('POST /api/visitors failed', { module: 'visitors', error: e })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/visitors — authenticated, admin/leader only
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '25')
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('visitors')
    .select(
      'id, first_name, last_name, first_name_ar, last_name_ar, phone, email, status, age_range, how_heard, visited_at, created_at, assigned_to, assigned_profile:assigned_to(id,first_name,last_name,first_name_ar,last_name_ar)',
      { count: 'exact' }
    )
    .eq('church_id', profile.church_id)
    .order('visited_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}, { requireRoles: ['super_admin', 'ministry_leader', 'group_leader'] })
