import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/bible/bookmarks/[id] — update bookmark note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabase
      .from('bible_bookmarks')
      .update({ note: body.note })
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[/api/bible/bookmarks/[id] PATCH]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('[/api/bible/bookmarks/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/bible/bookmarks/[id] — remove bookmark
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('bible_bookmarks')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id)

    if (error) {
      console.error('[/api/bible/bookmarks/[id] DELETE]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[/api/bible/bookmarks/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
