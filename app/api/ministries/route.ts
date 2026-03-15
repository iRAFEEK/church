import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateMinistrySchema } from '@/lib/schemas/ministry'
import { normalizeSearch } from '@/lib/utils/normalize'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

// GET /api/ministries — list ministries for the current church
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined

  let query = supabase
    .from('ministries')
    .select('id, name, name_ar, description, description_ar, is_active, photo_url, church_id, created_at, leader:leader_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url), ministry_members(count)')
    .eq('church_id', profile.church_id)
    .order('name')

  if (q) {
    const escaped = sanitizeLikePattern(q)
    const normalized = normalizeSearch(escaped)
    const parts = [`name.ilike.%${escaped}%`, `name_ar.ilike.%${escaped}%`]
    if (normalized !== escaped) {
      parts.push(`name.ilike.%${normalized}%`, `name_ar.ilike.%${normalized}%`)
    }
    query = query.or(parts.join(','))
  }
  if (pageSize) query = query.limit(pageSize)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST /api/ministries — create a new ministry
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = validate(CreateMinistrySchema, await req.json())

  const { data, error } = await supabase
    .from('ministries')
    .insert({
      church_id: profile.church_id,
      name: body.name,
      name_ar: body.name_ar ?? null,
      description: body.description ?? null,
      description_ar: body.description_ar ?? null,
      leader_id: body.leader_id ?? null,
      is_active: body.is_active,
      ...(body.photo_url ? { photo_url: body.photo_url } : {}),
    })
    .select('id, name, name_ar, description, description_ar, is_active, photo_url, church_id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}, { requireRoles: ['ministry_leader', 'super_admin'] })
