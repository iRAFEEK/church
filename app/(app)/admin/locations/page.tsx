import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { LocationsTable } from '@/components/locations/LocationsTable'

export default async function LocationsPage() {
  const user = await requirePermission('can_manage_locations')
  const t = await getTranslations('locations')
  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, name_ar, location_type, capacity, features, is_active, notes, notes_ar, created_at')
    .eq('church_id', user.profile.church_id)
    .order('name')
    .limit(200)

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('pageSubtitle')}</p>
        </div>
        <Link href="/admin/locations/new">
          <Button className="h-11">
            <Plus className="h-4 w-4 me-2" />
            {t('addLocation')}
          </Button>
        </Link>
      </div>

      <LocationsTable locations={locations ?? []} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
