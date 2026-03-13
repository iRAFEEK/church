import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'

const DisplaySettingsSchema = z.object({
  bg_color: z.string().max(20).optional(),
  bg_image: z.string().url().optional().nullable(),
  text_color: z.string().max(20).optional(),
  font_family: z.enum(['sans', 'serif', 'mono', 'arabic']).optional(),
  font_size: z.number().int().min(12).max(120).optional(),
})

// PATCH /api/songs/[id]/display — update display settings only
export const PATCH = apiHandler(async ({ req, supabase, profile, params }) => {
  const display_settings = validate(DisplaySettingsSchema, await req.json())

  const { data, error } = await supabase
    .from('songs')
    .update({ display_settings })
    .eq('id', params!.id)
    .eq('church_id', profile.church_id)
    .select('display_settings')
    .single()

  if (error) {
    console.error('[/api/songs/[id]/display PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ data })
})
