import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/profile/bible-preference — save preferred Bible version
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { preferred_bible_id } = body

    if (!preferred_bible_id || typeof preferred_bible_id !== 'string') {
      return NextResponse.json({ error: 'preferred_bible_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ preferred_bible_id })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
