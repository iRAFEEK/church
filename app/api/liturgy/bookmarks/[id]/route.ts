import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'

// DELETE /api/liturgy/bookmarks/[id]
export const DELETE = apiHandler(async ({ supabase, profile, params }) => {
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: 'Missing bookmark id' }, { status: 400 })
  }

  // Verify ownership: must belong to the requesting user's profile + church
  const { data: existing, error: fetchError } = await supabase
    .from('liturgical_bookmarks')
    .select('id')
    .eq('id', id)
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('liturgical_bookmarks')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id)
    .eq('church_id', profile.church_id)

  if (error) throw error

  revalidateTag(`liturgy-bookmarks-${profile.id}`)

  return NextResponse.json({ success: true }, { status: 200 })
})
