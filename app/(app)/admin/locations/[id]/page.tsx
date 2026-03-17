import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { LocationForm } from '@/components/locations/LocationForm'

type Params = { params: Promise<{ id: string }> }

export default async function EditLocationPage({ params }: Params) {
  const { id } = await params
  const user = await requirePermission('can_manage_locations')
  const t = await getTranslations('locations')
  const supabase = await createClient()

  const { data: location } = await supabase
    .from('locations')
    .select('id, name, name_ar, location_type, capacity, features, notes, notes_ar, is_active')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!location) {
    redirect('/admin/locations')
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/admin/locations">
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t('backToLocations')}>
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">{t('editLocation')}</h1>
      </div>

      <LocationForm location={location} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
