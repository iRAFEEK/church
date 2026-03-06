import { createClient } from '@/lib/supabase/server'
import type { Church, ChurchLeader } from '@/types'

export async function getLandingPageData() {
  const supabase = await createClient()

  const { data: church } = await supabase
    .from('churches')
    .select('id, name, name_ar, country, logo_url, primary_color, welcome_message, welcome_message_ar')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!church) return null

  const { data: leaders } = await supabase
    .from('church_leaders')
    .select('id, name, name_ar, title, title_ar, photo_url, bio, bio_ar, display_order')
    .eq('church_id', church.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return {
    church: church as Church,
    leaders: (leaders ?? []) as ChurchLeader[],
  }
}
