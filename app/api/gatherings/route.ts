import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'

export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
  const body = await req.json()

  const { data, error } = await supabase
    .from('gatherings')
    .insert({ ...body, church_id: profile.church_id, created_by: user.id })
    .select()
    .single()

  if (error) {
    console.error('[/api/gatherings POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
})
