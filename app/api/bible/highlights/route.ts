import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bible/highlights — list user's highlights, optional ?chapter_id= filter
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('church_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const chapterId = searchParams.get('chapter_id')

    let query = supabase
      .from('bible_highlights')
      .select('*')
      .eq('profile_id', user.id)
      .eq('church_id', profile.church_id)

    if (chapterId) {
      query = query.eq('chapter_id', chapterId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/bible/highlights — create or upsert a highlight
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('church_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await req.json()
    const { bible_id, book_id, chapter_id, verse_id, reference_label, reference_label_ar, color } = body

    const { data, error } = await supabase
      .from('bible_highlights')
      .upsert(
        {
          bible_id,
          book_id,
          chapter_id,
          verse_id,
          reference_label,
          reference_label_ar: reference_label_ar || null,
          color,
          profile_id: user.id,
          church_id: profile.church_id,
        },
        { onConflict: 'profile_id,verse_id,bible_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
