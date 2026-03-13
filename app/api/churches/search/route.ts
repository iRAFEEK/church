import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  const query = supabase
    .from('churches')
    .select('id, name, name_ar, country, logo_url, denomination')
    .eq('is_active', true)
    .limit(10)

  if (q.length > 0) {
    const safe = sanitizeLikePattern(q)
    query.or(`name.ilike.%${safe}%,name_ar.ilike.%${safe}%`)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
