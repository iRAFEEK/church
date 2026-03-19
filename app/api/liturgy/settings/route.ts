import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { unstable_cache } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateChurchLiturgicalSettingsSchema } from '@/lib/schemas/liturgy'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/liturgy/settings — get church liturgical settings
export const GET = apiHandler(async ({ profile }) => {
  const churchId = profile.church_id

  const data = await unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data: settings, error } = await supabase
        .from('church_liturgical_settings')
        .select('id, church_id, tradition_id, preferred_language, created_at, updated_at')
        .eq('church_id', churchId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return settings
    },
    [`liturgy-settings-${churchId}`],
    { tags: [`liturgy-settings-${churchId}`], revalidate: 3600 }
  )()

  return { data }
}, { rateLimit: 'relaxed' })

// PUT /api/liturgy/settings — update church liturgical settings (super_admin only)
export const PUT = apiHandler(async ({ req, supabase, profile }) => {
  const body = await req.json()
  const validated = validate(UpdateChurchLiturgicalSettingsSchema, body)
  const churchId = profile.church_id

  const { data, error } = await supabase
    .from('church_liturgical_settings')
    .upsert(
      {
        church_id: churchId,
        tradition_id: validated.tradition_id,
        preferred_language: validated.preferred_language,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'church_id' }
    )
    .select('id, church_id, tradition_id, preferred_language, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`liturgy-settings-${churchId}`)

  return NextResponse.json({ data }, { status: 200 })
}, { requireRoles: ['super_admin'] })
