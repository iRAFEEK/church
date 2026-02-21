import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { notifyWelcomeVisitor } from '@/lib/messaging/triggers'

// POST /api/visitors — public, no auth required
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { first_name, last_name, phone, email, age_range, occupation, how_heard, church_id } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'الاسم الأول والأخير مطلوبان' }, { status: 400 })
    }

    // Use admin client — public form has no session
    const supabase = await createAdminClient()

    // Resolve church_id: use provided or fall back to first active church
    let resolvedChurchId = church_id
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
      return NextResponse.json({ error: 'لا توجد كنيسة مسجلة' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('visitors')
      .insert({
        church_id: resolvedChurchId,
        first_name,
        last_name,
        phone: phone || null,
        email: email || null,
        age_range: age_range || null,
        occupation: occupation || null,
        how_heard: how_heard || null,
      })
      .select()
      .single()

    if (error) throw error

    // Fire-and-forget: send welcome WhatsApp to visitor
    notifyWelcomeVisitor(data.id, resolvedChurchId).catch(console.error)

    return NextResponse.json({ data }, { status: 201 })
  } catch (e: unknown) {
    console.error('POST /api/visitors', e)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}

// GET /api/visitors — authenticated, admin/leader only
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('visitors')
    .select('*, assigned_profile:assigned_to(id,first_name,last_name,first_name_ar,last_name_ar)', { count: 'exact' })
    .order('visited_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    count,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  })
}
