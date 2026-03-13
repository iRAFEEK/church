import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/bible/bibles — list all available Bible versions
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('bible_versions')
      .select('id, name, name_local, abbreviation, abbreviation_local, language_id, language_name, language_name_local, copyright')
      .order('language_id')

    if (error) {
      console.error('[/api/bible/bibles GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    })
  } catch (error: any) {
    console.error('[/api/bible/bibles GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
