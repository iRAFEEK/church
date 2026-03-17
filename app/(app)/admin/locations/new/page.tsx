import { requirePermission } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { LocationForm } from '@/components/locations/LocationForm'

export default async function NewLocationPage() {
  await requirePermission('can_manage_locations')
  const t = await getTranslations('locations')

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/admin/locations">
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t('backToLocations')}>
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">{t('addLocation')}</h1>
      </div>

      <LocationForm />
    </div>
  )
}

export const dynamic = 'force-dynamic'
