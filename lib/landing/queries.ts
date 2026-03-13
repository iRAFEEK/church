import { createClient } from '@/lib/supabase/server'
import { getCachedChurchLeaders } from '@/lib/cache/queries'
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

  const leaders = await getCachedChurchLeaders(church.id)

  return {
    church: church as Church,
    leaders: leaders as ChurchLeader[],
  }
}
