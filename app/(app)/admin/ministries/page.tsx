import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { resolveUserScope } from '@/lib/scope'
import { MinistriesTable } from '@/components/ministries/MinistriesTable'

export default async function MinistriesPage() {
  const user = await requireRole('ministry_leader', 'super_admin')

  const t = await getTranslations('ministries')
  const supabase = await createClient()

  const isSuperAdmin = user.profile.role === 'super_admin'

  let ministriesQuery = supabase
    .from('ministries')
    .select('*, leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url), ministry_members(count)')
    .order('name')

  if (!isSuperAdmin) {
    const scope = await resolveUserScope(supabase, user.id, user.profile.church_id)
    if (scope.ministryIds.length > 0) {
      ministriesQuery = ministriesQuery.in('id', scope.ministryIds)
    } else {
      ministriesQuery = ministriesQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: ministries } = await ministriesQuery

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('pageSubtitle')}</p>
        </div>
        {isSuperAdmin && (
          <Link href="/admin/ministries/new">
            <Button>{t('newButton')}</Button>
          </Link>
        )}
      </div>

      <MinistriesTable ministries={ministries || []} />
    </div>
  )
}
