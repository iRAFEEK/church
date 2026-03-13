import { apiHandler } from '@/lib/api/handler'

export const POST = apiHandler(async ({ req, supabase, profile, user }) => {
  const body = await req.json()

  const { data, error } = await supabase
    .from('gatherings')
    .insert({ ...body, church_id: profile.church_id, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return Response.json({ data }, { status: 201 })
})
