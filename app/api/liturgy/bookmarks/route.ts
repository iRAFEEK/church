import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { CreateLiturgicalBookmarkSchema } from '@/lib/schemas/liturgy'

// GET /api/liturgy/bookmarks — list user's liturgical bookmarks
export const GET = apiHandler(async ({ req, supabase, profile }) => {
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '25'), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('liturgical_bookmarks')
    .select('id, content_id, hymn_id, note, created_at', { count: 'exact' })
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
})

// POST /api/liturgy/bookmarks — create a liturgical bookmark
export const POST = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(CreateLiturgicalBookmarkSchema, body)

  const { data, error } = await supabase
    .from('liturgical_bookmarks')
    .insert({
      ...validated,
      profile_id: profile.id,
      church_id: profile.church_id,
    })
    .select('id, content_id, hymn_id, note, created_at')
    .single()

  if (error) throw error

  revalidateTag(`liturgy-bookmarks-${profile.id}`)

  return NextResponse.json({ data }, { status: 201 })
})
