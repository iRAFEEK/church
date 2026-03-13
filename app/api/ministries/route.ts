import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normalizeSearch } from '@/lib/utils/normalize'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined

  let query = supabase
    .from('ministries')
    .select('*, leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url), ministry_members(count)')
    .order('name')

  if (q) {
    const normalized = normalizeSearch(q)
    const parts = [`name.ilike.%${q}%`, `name_ar.ilike.%${q}%`]
    if (normalized !== q) {
      parts.push(`name.ilike.%${normalized}%`, `name_ar.ilike.%${normalized}%`)
    }
    query = query.or(parts.join(','))
  }
  if (pageSize) query = query.limit(pageSize)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const row: Record<string, unknown> = {
    church_id: profile.church_id,
    name: body.name,
    name_ar: body.name_ar || null,
    description: body.description || null,
    description_ar: body.description_ar || null,
    leader_id: body.leader_id || null,
    is_active: body.is_active ?? true,
  }
  if (body.photo_url) row.photo_url = body.photo_url

  const { data, error } = await supabase
    .from('ministries')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag(`ministries-${profile.church_id}`)
  revalidateTag(`dashboard-${profile.church_id}`)
  return NextResponse.json({ data }, { status: 201 })
}
